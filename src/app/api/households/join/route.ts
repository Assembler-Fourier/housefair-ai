import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureProfile, requireUser } from "@/lib/saas/auth";
import { withDbTransaction } from "@/lib/server/db";

const joinSchema = z.object({
  invite_code: z.string().trim().min(6).max(80),
  display_name: z.string().trim().min(2).max(80),
  room_name: z.string().trim().max(80).optional(),
});

type InviteRow = {
  id: string;
  household_id: string;
  role: "admin" | "member";
  expires_at: string;
  accepted_at: string | null;
  member_limit: number;
};

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await ensureProfile(user);
    const input = joinSchema.parse(await request.json());
    const householdId = await withDbTransaction(async (client) => {
      const result = await client.query<InviteRow>(
        `select i.id, i.household_id, i.role, i.expires_at, i.accepted_at, h.member_limit
           from public.household_invites i
           join public.households h on h.id = i.household_id
          where i.invite_code = $1
          for update of i`,
        [input.invite_code],
      );
      const invite = result.rows[0];
      if (!invite || invite.accepted_at) throw new Error("Invite code is invalid or already used.");
      if (new Date(invite.expires_at).getTime() < Date.now()) throw new Error("Invite code has expired.");
      const count = await client.query<{ count: string }>(
        "select count(*) from public.household_members where household_id = $1 and status = 'active'",
        [invite.household_id],
      );
      if (Number(count.rows[0]?.count ?? 0) >= invite.member_limit) throw new Error("This household is already full.");
      await client.query(
        `insert into public.household_members
           (household_id, profile_id, role, display_name, room_name, status, updated_at)
         values ($1, $2, $3, $4, $5, 'active', now())
         on conflict (household_id, profile_id) do update set
           role = excluded.role,
           display_name = excluded.display_name,
           room_name = excluded.room_name,
           status = 'active',
           updated_at = now()`,
        [invite.household_id, user.id, invite.role, input.display_name, input.room_name || null],
      );
      await client.query("update public.household_invites set accepted_at = now() where id = $1", [invite.id]);
      await client.query(
        "insert into public.app_events (profile_id, household_id, event_name, properties) values ($1, $2, 'invite_accepted', '{}'::jsonb)",
        [user.id, invite.household_id],
      );
      return invite.household_id;
    });

    return NextResponse.json({ household_id: householdId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to join household." },
      { status: 400 },
    );
  }
}
