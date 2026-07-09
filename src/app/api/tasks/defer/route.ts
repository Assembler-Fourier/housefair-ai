import { addHours, formatISO, isAfter, setHours, setMinutes, setSeconds, setMilliseconds } from "date-fns";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSeedHouseState } from "@/lib/house-data";
import { dbQuery, dbQueryOne, insertRow, isPostgresConfigured } from "@/lib/server/db";
import { sendPushToUser } from "@/lib/server/push";
import {
  auditLog,
  authenticateDevice,
  parseJson,
  rateLimit,
} from "@/lib/server/security";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { Task } from "@/lib/types";

export const runtime = "nodejs";

const deferTaskSchema = z.object({
  taskId: z.string().min(1),
  reason: z.string().max(280).optional(),
  remindAt: z.string().datetime().optional(),
});

function defaultReminderTime() {
  const now = new Date();
  const tonight = setMilliseconds(setSeconds(setMinutes(setHours(now, 20), 0), 0), 0);
  return isAfter(tonight, addHours(now, 1)) ? tonight : addHours(now, 24);
}

function reminderIso(input?: string) {
  return input ?? defaultReminderTime().toISOString();
}

async function getTask(taskId: string) {
  if (isPostgresConfigured()) {
    return dbQueryOne<Task>("select * from public.tasks where id = $1 limit 1", [taskId]);
  }

  if (!isSupabaseConfigured()) {
    return createSeedHouseState().tasks.find((task) => task.id === taskId) ?? null;
  }

  const { data, error } = await getSupabaseAdmin()
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .single();

  if (error) throw error;
  return data as Task;
}

export async function POST(request: Request) {
  const limited = rateLimit(request, "task-defer", 10, 60 * 60 * 1000);
  if (limited) return limited;

  const auth = await authenticateDevice(request);
  if (auth.response) return auth.response;

  const parsed = await parseJson(request, deferTaskSchema);
  if (parsed.response) return parsed.response;

  const input = parsed.data;
  const task = await getTask(input.taskId);

  if (!task) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }
  if (task.status === "completed") {
    return NextResponse.json({ error: "Completed tasks cannot be deferred." }, { status: 400 });
  }
  if (task.assigned_person && task.assigned_person !== auth.session.personId) {
    return NextResponse.json(
      { error: "Only the assigned housemate can mark this task as not possible today." },
      { status: 403 },
    );
  }

  const now = new Date().toISOString();
  const nextReminderAt = reminderIso(input.remindAt);
  const reason = input.reason?.trim() || "Could not do it today.";

  let updatedTask: Task = {
    ...task,
    status: "pending",
    assigned_person: task.assigned_person ?? auth.session.personId,
    deferral_count: (task.deferral_count ?? 0) + 1,
    deferred_by: auth.session.personId,
    deferred_at: now,
    defer_reason: reason,
    next_reminder_at: nextReminderAt,
  };

  if (isPostgresConfigured()) {
    const rows = await dbQuery<Task>(
      `update public.tasks
       set status = 'pending',
           assigned_person = coalesce(assigned_person, $2),
           deferral_count = coalesce(deferral_count, 0) + 1,
           deferred_by = $2,
           deferred_at = $3,
           defer_reason = $4,
           next_reminder_at = $5
       where id = $1
       returning *`,
      [task.id, auth.session.personId, now, reason, nextReminderAt],
    );
    updatedTask = rows[0] ?? updatedTask;

    await insertRow("notifications", {
      recipient: updatedTask.assigned_person,
      title: `${updatedTask.title} carried over`,
      body: `Still pending for you. Reminder set for ${formatISO(new Date(nextReminderAt), {
        representation: "complete",
      })}.`,
      type: "task",
      scheduled_for: nextReminderAt,
      payload: { task_id: updatedTask.id, reason, deferred_by: auth.session.personId },
    });
  } else if (isSupabaseConfigured()) {
    const { data, error } = await getSupabaseAdmin()
      .from("tasks")
      .update({
        status: "pending",
        assigned_person: task.assigned_person ?? auth.session.personId,
        deferral_count: (task.deferral_count ?? 0) + 1,
        deferred_by: auth.session.personId,
        deferred_at: now,
        defer_reason: reason,
        next_reminder_at: nextReminderAt,
      })
      .eq("id", task.id)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    updatedTask = data as Task;

    await getSupabaseAdmin().from("notifications").insert({
      recipient: updatedTask.assigned_person,
      title: `${updatedTask.title} carried over`,
      body: "Still pending for you. Reminder has been scheduled.",
      type: "task",
      scheduled_for: nextReminderAt,
      payload: { task_id: updatedTask.id, reason, deferred_by: auth.session.personId },
    });
  }

  const push = await sendPushToUser(updatedTask.assigned_person, {
    title: `${updatedTask.title} is still pending`,
    body: "No stress. It has been carried forward and will stay on your pending list.",
    url: "/",
    tag: "task",
  });

  await auditLog({
    personId: auth.session.personId,
    deviceId: auth.session.deviceId,
    action: "deferred_task",
    entityType: "task",
    entityId: updatedTask.id,
    metadata: { reason, next_reminder_at: nextReminderAt, push },
  });

  return NextResponse.json({ task: updatedTask, push });
}
