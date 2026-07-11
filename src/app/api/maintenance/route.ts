import { NextResponse } from "next/server";
import { z } from "zod";
import { getHouseState } from "@/lib/data";
import { dbQuery, isPostgresConfigured, updateRows } from "@/lib/server/db";
import { authenticateDevice, parseJson, rateLimit } from "@/lib/server/security";

export const runtime = "nodejs";

const maintenanceSchema = z.object({
  pin: z.string().min(4),
  action: z.enum(["export_data", "reset_points", "reset_test_data", "audit_logs"]),
});

function authorized(pin: string) {
  const secret = process.env.MAINTENANCE_SECRET ?? process.env.MAINTENANCE_PIN;
  return Boolean(secret && pin === secret);
}

export async function POST(request: Request) {
  const limited = rateLimit(request, "maintenance", 10, 10 * 60 * 1000);
  if (limited) return limited;

  const auth = await authenticateDevice(request);
  if (auth.response) return auth.response;

  const parsed = await parseJson(request, maintenanceSchema);
  if (parsed.response) return parsed.response;
  if (!authorized(parsed.data.pin)) {
    return NextResponse.json({ error: "Incorrect maintenance PIN." }, { status: 401 });
  }

  if (parsed.data.action === "export_data") {
    return NextResponse.json({ state: await getHouseState() });
  }

  if (!isPostgresConfigured()) {
    return NextResponse.json({ error: "Maintenance writes require DATABASE_URL." }, { status: 500 });
  }

  if (parsed.data.action === "audit_logs") {
    const logs = await dbQuery(
      "select * from public.audit_logs order by created_at desc limit 100",
    );
    return NextResponse.json({ logs });
  }

  if (parsed.data.action === "reset_points") {
    await updateRows("users", { current_points: 0, cleaning_streak: 0 }, "true", []);
    await dbQuery("delete from public.points_ledger");
    await dbQuery("delete from public.task_history");
    await dbQuery("delete from public.rewards");
    return NextResponse.json({ ok: true, action: parsed.data.action });
  }

  await dbQuery("delete from public.receipts");
  await dbQuery("delete from public.money_comments");
  await dbQuery("delete from public.expense_splits");
  await dbQuery("delete from public.settlements");
  await dbQuery("delete from public.expenses");
  await dbQuery("delete from public.complaint_votes");
  await dbQuery("delete from public.complaints");
  await dbQuery("delete from public.task_swaps");
  await dbQuery("delete from public.weekly_reports");
  await dbQuery("delete from public.house_rule_acceptances");
  await dbQuery("delete from public.user_preferences");
  await dbQuery("delete from public.points_ledger");
  await dbQuery("delete from public.task_history");
  await dbQuery("delete from public.audit_logs");
  await dbQuery("delete from public.user_devices");
  await dbQuery("delete from public.house_settings");
  await dbQuery("insert into public.house_settings (key, value) values ('house_mode', '{\"mode\":\"normal\"}'::jsonb)");
  await dbQuery("update public.users set current_points = 0, cleaning_streak = 0");

  return NextResponse.json({ ok: true, action: parsed.data.action });
}
