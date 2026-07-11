import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, apiErrorResponse, getHouseholdApiContext } from "@/lib/saas/api";
import { recordHouseholdActivity, type HouseholdTask } from "@/lib/saas/core";
import { rateLimit } from "@/lib/server/security";
import { dbQueryOne, insertRow, updateRows } from "@/lib/server/db";

const baseTaskSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).default(""),
  area: z.string().trim().min(2).max(100),
  difficulty: z.enum(["easy", "medium", "heavy"]),
  difficulty_reason: z.string().trim().max(240).default(""),
  estimated_minutes: z.coerce.number().int().min(1).max(480),
  points: z.coerce.number().int().min(1).max(100),
  points_reason: z.string().trim().max(240).default(""),
  frequency: z.enum(["once", "daily", "every_second_day", "weekly", "monthly"]),
  due_date: z.string().date(),
  assigned_member_id: z.string().uuid().nullable().optional(),
  checklist: z.array(z.string().trim().min(1).max(160)).max(20).default([]),
  proof_required: z.boolean().default(false),
});

const taskActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), task: baseTaskSchema }),
  z.object({
    action: z.literal("complete"),
    task_id: z.string().uuid(),
    completed_items: z.array(z.string().trim().min(1).max(160)).max(20),
    notes: z.string().trim().max(1000).optional(),
  }),
  z.object({
    action: z.literal("defer"),
    task_id: z.string().uuid(),
    days: z.coerce.number().int().min(1).max(7).default(1),
  }),
  z.object({
    action: z.literal("assign"),
    task_id: z.string().uuid(),
    assigned_member_id: z.string().uuid().nullable(),
  }),
]);

function nextDueDate(current: string, frequency: HouseholdTask["frequency"]) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(current)
    ? new Date(`${current}T12:00:00Z`)
    : new Date(current);
  if (frequency === "daily") date.setUTCDate(date.getUTCDate() + 1);
  if (frequency === "every_second_day") date.setUTCDate(date.getUTCDate() + 2);
  if (frequency === "weekly") date.setUTCDate(date.getUTCDate() + 7);
  if (frequency === "monthly") date.setUTCMonth(date.getUTCMonth() + 1);
  return date.toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  const limited = rateLimit(request, "saas-tasks", 50, 60_000);
  if (limited) return limited;

  try {
    const context = await getHouseholdApiContext();
    const input = taskActionSchema.parse(await request.json());
    if (input.action === "create") {
      if (input.task.assigned_member_id) {
        const member = await dbQueryOne<{ exists: boolean }>(
          "select exists(select 1 from public.household_members where household_id = $1 and id = $2 and status = 'active') as exists",
          [context.household.id, input.task.assigned_member_id],
        );
        if (!member?.exists) throw new ApiError("Assignee is not in this household.", 400);
      }

      const data = await insertRow<{ id: string }>("household_tasks", {
          household_id: context.household.id,
          created_by_profile_id: context.user.id,
          ...input.task,
          checklist: JSON.stringify(input.task.checklist),
        });
      if (!data) throw new Error("Task could not be created.");
      await recordHouseholdActivity({
        householdId: context.household.id,
        actorMemberId: context.member.id,
        eventType: "task_created",
        title: `Added ${input.task.title}`,
        detail: `${input.task.points} points · ${input.task.estimated_minutes} min`,
        entityType: "task",
        entityId: data.id,
      });
      return NextResponse.json({ ok: true, id: data.id });
    }

    const task = await dbQueryOne<HouseholdTask>(
      "select * from public.household_tasks where id = $1 and household_id = $2 limit 1",
      [input.task_id, context.household.id],
    );
    if (!task) throw new ApiError("Task not found.", 404);

    if (input.action === "assign") {
      if (input.assigned_member_id) {
        const member = await dbQueryOne<{ exists: boolean }>(
          "select exists(select 1 from public.household_members where household_id = $1 and id = $2 and status = 'active') as exists",
          [context.household.id, input.assigned_member_id],
        );
        if (!member?.exists) throw new ApiError("Assignee is not in this household.", 400);
      }
      await updateRows("household_tasks", { assigned_member_id: input.assigned_member_id }, "id = $1 and household_id = $2", [task.id, context.household.id]);
      return NextResponse.json({ ok: true });
    }

    if (input.action === "defer") {
      const due = /^\d{4}-\d{2}-\d{2}$/.test(task.due_date)
        ? new Date(`${task.due_date}T12:00:00Z`)
        : new Date(task.due_date);
      due.setUTCDate(due.getUTCDate() + input.days);
      const dueDate = due.toISOString().slice(0, 10);
      await updateRows("household_tasks", { due_date: dueDate, status: "deferred" }, "id = $1 and household_id = $2", [task.id, context.household.id]);
      await insertRow("household_notifications", {
        household_id: context.household.id,
        recipient_member_id: task.assigned_member_id ?? context.member.id,
        title: "Task moved to pending",
        body: `${task.title} is now due ${dueDate}.`,
        kind: "task",
      });
      await recordHouseholdActivity({
        householdId: context.household.id,
        actorMemberId: context.member.id,
        eventType: "task_deferred",
        title: `Moved ${task.title}`,
        detail: `New due date: ${dueDate}`,
        entityType: "task",
        entityId: task.id,
      });
      return NextResponse.json({ ok: true, due_date: dueDate });
    }

    if (task.status === "completed") throw new ApiError("Task is already completed.", 409);
    const requiredItems = new Set(task.checklist);
    const completedItems = new Set(input.completed_items);
    if ([...requiredItems].some((item) => !completedItems.has(item))) {
      throw new ApiError("Complete every checklist item first.", 400);
    }
    if (task.proof_required) {
      const proof = await dbQueryOne<{ before_path: string | null; after_path: string | null }>(
        "select before_path, after_path from public.household_task_proofs where task_id = $1 and household_id = $2 limit 1",
        [task.id, context.household.id],
      );
      if (!proof?.before_path || !proof.after_path) {
        throw new ApiError("Heavy tasks need a live before and after photo.", 400);
      }
    }

    const completedAt = new Date().toISOString();
    await updateRows("household_tasks", {
        status: "completed",
        completed_by_member_id: context.member.id,
        completed_items: JSON.stringify(input.completed_items),
        completion_notes: input.notes || null,
        completed_at: completedAt,
      }, "id = $1 and household_id = $2", [task.id, context.household.id]);

    if (task.frequency !== "once") {
      await insertRow("household_tasks", {
        household_id: context.household.id,
        title: task.title,
        description: task.description,
        area: task.area,
        difficulty: task.difficulty,
        difficulty_reason: task.difficulty_reason,
        estimated_minutes: task.estimated_minutes,
        points: task.points,
        points_reason: task.points_reason,
        frequency: task.frequency,
        due_date: nextDueDate(task.due_date, task.frequency),
        assigned_member_id: task.assigned_member_id,
        checklist: JSON.stringify(task.checklist),
        proof_required: task.proof_required,
        created_by_profile_id: context.user.id,
      });
    }

    await recordHouseholdActivity({
      householdId: context.household.id,
      actorMemberId: context.member.id,
      eventType: "task_completed",
      title: `Completed ${task.title}`,
      detail: `+${task.points} points · ${task.difficulty} · ${task.estimated_minutes} min`,
      entityType: "task",
      entityId: task.id,
      metadata: { points: task.points, difficulty: task.difficulty },
    });
    return NextResponse.json({ ok: true, completed_at: completedAt });
  } catch (error) {
    return apiErrorResponse(error, "api.app.tasks");
  }
}
