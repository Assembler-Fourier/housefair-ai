import { startOfWeek, formatISO } from "date-fns";
import { NextResponse } from "next/server";
import { getHouseState } from "@/lib/data";
import { auditLog, authenticateDevice, rateLimit } from "@/lib/server/security";
import { isPostgresConfigured, upsertRow } from "@/lib/server/db";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function currency(value: number) {
  return Math.round(value * 100) / 100;
}

export async function POST(request: Request) {
  const limited = rateLimit(request, "weekly-report", 6, 60 * 60 * 1000);
  if (limited) return limited;

  const auth = await authenticateDevice(request);
  if (auth.response) return auth.response;

  const state = await getHouseState();
  const weekStart = formatISO(startOfWeek(new Date(), { weekStartsOn: 1 }), {
    representation: "date",
  });
  const totalSpending = state.expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const report = {
    generated_at: new Date().toISOString(),
    house_mode: state.house_mode,
    cleaning_score: state.stats.house_cleanliness,
    completed_tasks: state.task_history.length,
    open_issues: state.complaints.filter((item) => item.status !== "resolved").length,
    money_summary: {
      total_spending: currency(totalSpending),
      expenses: state.expenses.length,
      settlements: state.settlements.length,
    },
    problems:
      state.complaints.length > 0
        ? state.complaints.slice(0, 3).map((item) => item.category)
        : ["No issues logged yet"],
    suggestions: [
      state.house_mode === "guests_coming"
        ? "Prioritize bathrooms, bins, and kitchen reset before guests arrive."
        : "Keep daily dish duty and kitchen reset small so mess does not build up.",
      state.expenses.length ? "Review simplified balances before the weekend." : "Add shared purchases as expenses when bought.",
      "Use swaps early instead of missing a task.",
    ],
  };

  const row = { week_start: weekStart, report };
  let weeklyReport = null;
  if (isPostgresConfigured()) {
    weeklyReport = await upsertRow("weekly_reports", row, ["week_start"]);
  } else if (isSupabaseConfigured()) {
    const { data } = await getSupabaseAdmin()
      .from("weekly_reports")
      .upsert(row, { onConflict: "week_start" })
      .select("*")
      .single();
    weeklyReport = data;
  } else {
    weeklyReport = { id: crypto.randomUUID(), ...row, created_at: new Date().toISOString() };
  }

  await auditLog({
    personId: auth.session.personId,
    deviceId: auth.session.deviceId,
    action: "generated_weekly_report",
    entityType: "weekly_report",
    entityId: weekStart,
    metadata: { cleaning_score: report.cleaning_score, house_mode: state.house_mode },
  });

  return NextResponse.json({ report: weeklyReport });
}
