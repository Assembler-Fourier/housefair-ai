import { NextResponse } from "next/server";
import { z } from "zod";
import { auditLog, authenticateDevice, parseJson, rateLimit } from "@/lib/server/security";
import { isPostgresConfigured, upsertRow } from "@/lib/server/db";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { HouseSetting } from "@/lib/types";

export const runtime = "nodejs";

const setupSchema = z.object({
  cleaning_day: z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]),
  bin_reminder: z.enum(["Thursday evening", "Friday morning", "Both"]),
  weekly_report_day: z.enum(["Friday", "Saturday", "Sunday", "Monday"]),
  monthly_settlement_day: z.coerce.number().int().min(1).max(28),
  notify_tasks: z.boolean(),
  notify_money: z.boolean(),
  notify_groceries: z.boolean(),
});

export async function POST(request: Request) {
  const limited = rateLimit(request, "house-setup", 10, 10 * 60 * 1000);
  if (limited) return limited;

  const auth = await authenticateDevice(request);
  if (auth.response) return auth.response;

  const parsed = await parseJson(request, setupSchema);
  if (parsed.response) return parsed.response;

  const row = {
    key: "launch_setup",
    value: parsed.data,
    updated_at: new Date().toISOString(),
  };

  let setting: HouseSetting | null = row;

  if (isPostgresConfigured()) {
    setting = await upsertRow<HouseSetting>("house_settings", row, ["key"]);
  } else if (isSupabaseConfigured()) {
    const { data, error } = await getSupabaseAdmin()
      .from("house_settings")
      .upsert(row, { onConflict: "key" })
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    setting = data as HouseSetting;
  }

  await auditLog({
    personId: auth.session.personId,
    deviceId: auth.session.deviceId,
    action: "updated_first_week_setup",
    entityType: "house_settings",
    entityId: "launch_setup",
    metadata: parsed.data,
  });

  return NextResponse.json({ setting });
}
