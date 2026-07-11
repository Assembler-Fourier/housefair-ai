import { NextResponse } from "next/server";
import { apiErrorResponse, getHouseholdApiContext } from "@/lib/saas/api";
import { getHouseholdAppData } from "@/lib/saas/core";
import { rateLimit } from "@/lib/server/security";
import { insertRow } from "@/lib/server/db";

export async function POST(request: Request) {
  const limited = rateLimit(request, "saas-ai-plan", 10, 60 * 60 * 1000);
  if (limited) return limited;

  try {
    const context = await getHouseholdApiContext();
    const data = await getHouseholdAppData({ household: context.household, profileId: context.user.id });
    const completedByMember = new Map<string, { points: number; heavy: number; minutes: number }>();
    for (const member of data.members) completedByMember.set(member.id, { points: 0, heavy: 0, minutes: 0 });
    for (const task of data.tasks.filter((item) => item.status === "completed" && item.completed_by_member_id)) {
      const totals = completedByMember.get(task.completed_by_member_id!);
      if (!totals) continue;
      totals.points += task.points;
      totals.minutes += task.estimated_minutes;
      if (task.difficulty === "heavy") totals.heavy += 1;
    }

    const openTasks = data.tasks.filter((task) => task.status !== "completed").sort((a, b) => {
      const weight = { heavy: 3, medium: 2, easy: 1 } as const;
      return weight[b.difficulty] - weight[a.difficulty] || a.due_date.localeCompare(b.due_date);
    });
    const projected = new Map([...completedByMember.entries()].map(([id, totals]) => [id, { ...totals }]));
    const recommendations = openTasks.map((task) => {
      const candidate = [...data.members].sort((a, b) => {
        const left = projected.get(a.id)!;
        const right = projected.get(b.id)!;
        if (task.difficulty === "heavy" && left.heavy !== right.heavy) return left.heavy - right.heavy;
        return left.minutes - right.minutes || left.points - right.points;
      })[0];
      const totals = projected.get(candidate.id)!;
      totals.points += task.points;
      totals.minutes += task.estimated_minutes;
      if (task.difficulty === "heavy") totals.heavy += 1;
      return {
        task_id: task.id,
        task: task.title,
        suggested_member_id: candidate.id,
        suggested_member: candidate.display_name,
        due_date: task.due_date,
        reason: `${candidate.display_name} has ${totals.heavy - (task.difficulty === "heavy" ? 1 : 0)} recent heavy tasks and the lowest projected workload for this assignment.`,
      };
    });

    const summary = recommendations.length
      ? `${recommendations.length} recommendation${recommendations.length === 1 ? "" : "s"} balance heavy work first, then estimated minutes and points.`
      : "No open tasks need a new assignment this week.";
    const plan = await insertRow("household_ai_plans", {
        household_id: context.household.id,
        generated_by_member_id: context.member.id,
        summary,
        recommendations: JSON.stringify(recommendations),
        status: "draft",
      });
    if (!plan) throw new Error("AI plan could not be saved.");
    return NextResponse.json({ plan, recommendation_only: true });
  } catch (error) {
    return apiErrorResponse(error, "api.app.ai.weekly-plan");
  }
}
