import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageBilling, getPrimaryHousehold, requireUser } from "@/lib/saas/auth";
import { getSiteUrl } from "@/lib/saas/server-config";
import { rateLimit } from "@/lib/server/security";
import { insertRow } from "@/lib/server/db";

const inviteSchema = z.object({
  household_id: z.string().uuid(),
  email: z.string().email().optional().or(z.literal("")),
  role: z.enum(["admin", "member"]).default("member"),
});

export async function POST(request: Request) {
  const limited = rateLimit(request, "household-invites", 12, 60 * 60 * 1000);
  if (limited) return limited;
  try {
    const user = await requireUser();
    const household = await getPrimaryHousehold(user.id);
    if (!household) {
      return NextResponse.json({ error: "Create or join a household first." }, { status: 400 });
    }

    const input = inviteSchema.parse(await request.json());
    if (input.household_id !== household.id) {
      return NextResponse.json({ error: "Household mismatch." }, { status: 403 });
    }
    if (!canManageBilling(household.role)) {
      return NextResponse.json(
        { error: "Only a household owner or admin can invite roommates." },
        { status: 403 },
      );
    }

    const inviteCode = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    const data = await insertRow<{ invite_code: string }>("household_invites", {
        household_id: household.id,
        email: input.email || null,
        invite_code: inviteCode,
        role: input.role,
        created_by: user.id,
      });
    if (!data) throw new Error("Invite could not be created.");

    await insertRow("app_events", {
      profile_id: user.id,
      household_id: household.id,
      event_name: "invite_created",
      properties: { role: input.role },
    });

    return NextResponse.json({
      invite_code: data.invite_code,
      invite_url: `${getSiteUrl()}/onboarding?invite=${data.invite_code}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create invite." },
      { status: 400 },
    );
  }
}
