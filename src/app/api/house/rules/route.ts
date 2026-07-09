import { NextResponse } from "next/server";
import { auditLog, authenticateDevice, rateLimit } from "@/lib/server/security";
import { isPostgresConfigured, upsertRow } from "@/lib/server/db";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const limited = rateLimit(request, "house-rules", 12, 10 * 60 * 1000);
  if (limited) return limited;

  const auth = await authenticateDevice(request);
  if (auth.response) return auth.response;

  const values = {
    user_id: auth.session.personId,
    accepted_at: new Date().toISOString(),
  };

  let acceptance = null;
  if (isPostgresConfigured()) {
    acceptance = await upsertRow("house_rule_acceptances", values, ["user_id"]);
  } else if (isSupabaseConfigured()) {
    const { data } = await getSupabaseAdmin()
      .from("house_rule_acceptances")
      .upsert(values, { onConflict: "user_id" })
      .select("*")
      .single();
    acceptance = data;
  } else {
    acceptance = { id: crypto.randomUUID(), ...values };
  }

  await auditLog({
    personId: auth.session.personId,
    deviceId: auth.session.deviceId,
    action: "accepted_house_rules",
    entityType: "house_rule_acceptance",
    entityId: auth.session.personId,
  });

  return NextResponse.json({ acceptance });
}
