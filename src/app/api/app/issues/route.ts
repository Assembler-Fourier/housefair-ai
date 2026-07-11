import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, apiErrorResponse, getHouseholdApiContext } from "@/lib/saas/api";
import { recordHouseholdActivity } from "@/lib/saas/core";
import { rateLimit } from "@/lib/server/security";
import { dbQueryOne, insertRow, updateRows } from "@/lib/server/db";

const issueActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    kind: z.enum(["report", "cleanup_request", "reminder"]),
    category: z.enum(["Dirty dishes", "Kitchen mess", "Bathroom mess", "Trash issue", "Noise", "Guest issue", "Missed task", "Other"]),
    location: z.string().trim().min(2).max(100),
    description: z.string().trim().min(4).max(1000),
    person_involved_member_id: z.string().uuid().nullable().optional(),
  }),
  z.object({
    action: z.literal("resolve"),
    issue_id: z.string().uuid(),
  }),
]);

export async function POST(request: Request) {
  const limited = rateLimit(request, "saas-issues", 8, 60 * 60 * 1000);
  if (limited) return limited;

  try {
    const context = await getHouseholdApiContext();
    const input = issueActionSchema.parse(await request.json());
    if (input.action === "resolve") {
      const issue = await dbQueryOne<{ id: string; reporter_member_id: string; category: string }>(
        "select id, reporter_member_id, category from public.household_issues where id = $1 and household_id = $2 limit 1",
        [input.issue_id, context.household.id],
      );
      if (!issue) throw new ApiError("House issue not found.", 404);
      if (issue.reporter_member_id !== context.member.id && context.household.role === "member") {
        throw new ApiError("Only the reporter or a household admin can resolve this issue.", 403);
      }
      await updateRows("household_issues", { status: "resolved" }, "id = $1 and household_id = $2", [issue.id, context.household.id]);
      await recordHouseholdActivity({
        householdId: context.household.id,
        actorMemberId: context.member.id,
        eventType: "issue_resolved",
        title: `Resolved ${issue.category}`,
        entityType: "issue",
        entityId: issue.id,
      });
      return NextResponse.json({ ok: true });
    }

    if (input.person_involved_member_id) {
      const member = await dbQueryOne<{ exists: boolean }>(
        "select exists(select 1 from public.household_members where household_id = $1 and id = $2 and status = 'active') as exists",
        [context.household.id, input.person_involved_member_id],
      );
      if (!member?.exists) throw new ApiError("Selected person is not in this household.", 400);
    }

    const data = await insertRow<{ id: string }>("household_issues", {
        household_id: context.household.id,
        kind: input.kind,
        category: input.category,
        location: input.location,
        description: input.description,
        reporter_member_id: context.member.id,
        person_involved_member_id: input.person_involved_member_id || null,
      });
    if (!data) throw new Error("House issue could not be created.");
    await recordHouseholdActivity({
      householdId: context.household.id,
      actorMemberId: context.member.id,
      eventType: "issue_created",
      title: `${input.kind === "cleanup_request" ? "Requested cleanup" : input.kind === "reminder" ? "Sent a reminder" : "Reported an issue"}: ${input.category}`,
      detail: input.location,
      entityType: "issue",
      entityId: data.id,
    });
    return NextResponse.json({ ok: true, id: data.id });
  } catch (error) {
    return apiErrorResponse(error, "api.app.issues");
  }
}
