import { NextResponse } from "next/server";
import { z } from "zod";
import { auditLog, authenticateDevice, parseJson, rateLimit } from "@/lib/server/security";
import { isPostgresConfigured, upsertRow } from "@/lib/server/db";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const modeSchema = z.object({
  mode: z.enum(["normal", "guests_coming", "deep_clean_week", "party_mode"]),
});

export async function POST(request: Request) {
  const limited = rateLimit(request, "house-mode", 20, 10 * 60 * 1000);
  if (limited) return limited;

  const auth = await authenticateDevice(request);
  if (auth.response) return auth.response;

  const parsed = await parseJson(request, modeSchema);
  if (parsed.response) return parsed.response;

  const value = {
    mode: parsed.data.mode,
    updated_by: auth.session.personId,
  };
  const row = {
    key: "house_mode",
    value,
    updated_at: new Date().toISOString(),
  };

  if (isPostgresConfigured()) {
    await upsertRow("house_settings", row, ["key"]);
  } else if (isSupabaseConfigured()) {
    await getSupabaseAdmin().from("house_settings").upsert(row, { onConflict: "key" });
  }

  await auditLog({
    personId: auth.session.personId,
    deviceId: auth.session.deviceId,
    action: "updated_house_mode",
    entityType: "house_settings",
    entityId: "house_mode",
    metadata: value,
  });

  return NextResponse.json({ setting: row });
}
