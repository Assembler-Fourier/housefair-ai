import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureProfile, requireUser } from "@/lib/saas/auth";
import { seedNewHousehold } from "@/lib/saas/seed";
import { dbQuery, insertRow } from "@/lib/server/db";

const createHouseholdSchema = z.object({
  name: z.string().trim().min(2).max(80),
  display_name: z.string().trim().min(2).max(80),
  room_name: z.string().trim().max(80).optional(),
  currency: z.string().trim().length(3).default("EUR"),
  timezone: z.string().trim().min(2).default("Europe/Dublin"),
  template: z.enum(["roommates", "family", "couple", "student_house"]).default("roommates"),
});

function slugify(value: string) {
  const base = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "household"}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await ensureProfile(user);
    const input = createHouseholdSchema.parse(await request.json());
    const household = await insertRow<{ id: string }>("households", {
        name: input.name,
        slug: slugify(input.name),
        owner_id: user.id,
        currency: input.currency.toUpperCase(),
        timezone: input.timezone,
        member_limit: 8,
      });
    if (!household) throw new Error("Household could not be created.");

    const ownerMember = await insertRow<{ id: string }>("household_members", {
        household_id: household.id,
        profile_id: user.id,
        role: "owner",
        display_name: input.display_name,
        room_name: input.room_name || null,
        status: "active",
      });
    if (!ownerMember) throw new Error("Household owner could not be created.");

    try {
      await seedNewHousehold({
        householdId: household.id,
        ownerMemberId: ownerMember.id,
        profileId: user.id,
      });
    } catch (seedError) {
      await dbQuery("delete from public.households where id = $1", [household.id]);
      throw seedError;
    }

    await insertRow("app_events", {
      profile_id: user.id,
      household_id: household.id,
      event_name: "household_created",
      properties: { template: input.template },
    });

    await insertRow("usage_counters", {
      household_id: household.id,
      period_start: new Date().toISOString().slice(0, 10),
      period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
    });

    return NextResponse.json({ household_id: household.id });
  } catch (error) {
    console.error("[households.create]", error);
    return NextResponse.json(
      { error: "Unable to create household. Please try again." },
      { status: 400 },
    );
  }
}
