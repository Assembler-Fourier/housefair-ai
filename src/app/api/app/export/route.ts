import { ApiError, apiErrorResponse, getHouseholdApiContext, requireHouseholdAdmin } from "@/lib/saas/api";
import { dbQuery } from "@/lib/server/db";

const exportTables = [
  "household_members",
  "household_tasks",
  "household_task_proofs",
  "household_groceries",
  "household_expenses",
  "household_expense_splits",
  "household_settlements",
  "household_issues",
  "household_activity",
  "household_ai_plans",
] as const;

function csvCell(value: unknown) {
  const text = value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  try {
    const context = await getHouseholdApiContext();
    requireHouseholdAdmin(context.household.role);
    const format = new URL(request.url).searchParams.get("format") ?? "json";
    if (format !== "json" && format !== "csv") throw new ApiError("Use json or csv format.", 400);
    const results = await Promise.all(
      exportTables.map((table) =>
        dbQuery<Record<string, unknown>>(`select * from public.${table} where household_id = $1`, [context.household.id]),
      ),
    );
    const exportedAt = new Date().toISOString();
    const data = Object.fromEntries(exportTables.map((table, index) => [table, results[index]]));

    if (format === "csv") {
      const activity = data.household_activity as Array<Record<string, unknown>>;
      const headers = ["created_at", "event_type", "title", "detail", "actor_member_id", "entity_type", "entity_id"];
      const body = [headers.join(","), ...activity.map((row) => headers.map((header) => csvCell(row[header])).join(","))].join("\r\n");
      return new Response(body, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="housefair-activity-${exportedAt.slice(0, 10)}.csv"`,
        },
      });
    }

    return new Response(JSON.stringify({ version: 1, exported_at: exportedAt, household: context.household, data }, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="housefair-backup-${exportedAt.slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    return apiErrorResponse(error, "api.app.export");
  }
}
