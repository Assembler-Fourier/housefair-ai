import { NextResponse } from "next/server";
import { z } from "zod";
import { createProofRecommendation } from "@/lib/fairness-engine";
import { createSeedHouseState } from "@/lib/house-data";
import {
  auditLog,
  authenticateDevice,
  parseJson,
  rateLimit,
} from "@/lib/server/security";
import {
  dbQuery,
  dbQueryOne,
  insertRow,
  isPostgresConfigured,
  updateRows,
} from "@/lib/server/db";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { areaEligibilityForUser } from "@/lib/server/area-eligibility";
import type { Task } from "@/lib/types";

export const runtime = "nodejs";

const completeTaskSchema = z.object({
  taskId: z.string(),
  beforeUrl: z.string().nullable().optional(),
  afterUrl: z.string().nullable().optional(),
  notes: z.string().max(800).optional(),
});

async function getTask(taskId: string) {
  if (isPostgresConfigured()) {
    return dbQueryOne<Task>("select * from public.tasks where id = $1 limit 1", [
      taskId,
    ]);
  }

  if (!isSupabaseConfigured()) {
    return createSeedHouseState().tasks.find((task) => task.id === taskId) ?? null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .single();

  if (error) throw error;
  return data as Task;
}

const rewardDefinitions = {
  cleaning_champion: {
    title: "Cleaning Champion",
    description: "Completed five real house tasks.",
  },
  bathroom_hero: {
    title: "Bathroom Hero",
    description: "Completed a shared bathroom clean with proof.",
  },
  trash_master: {
    title: "Trash Master",
    description: "Handled trash or bin responsibility.",
  },
  perfect_week: {
    title: "Perfect Week",
    description: "Completed three house tasks in the last seven days.",
  },
} as const;

function taskText(task: Task) {
  return `${task.title} ${task.location}`.toLowerCase();
}

async function unlockPostgresRewards(userId: string, task: Task) {
  const existing = new Set(
    (
      await dbQuery<{ kind: string }>(
        "select kind from public.rewards where user_id = $1",
        [userId],
      )
    ).map((row) => row.kind),
  );
  const [totalRow] = await dbQuery<{ count: string }>(
    "select count(*)::text as count from public.task_history where completed_by = $1",
    [userId],
  );
  const [weekRow] = await dbQuery<{ count: string }>(
    "select count(*)::text as count from public.task_history where completed_by = $1 and completed_at >= now() - interval '7 days'",
    [userId],
  );
  const completedCount = Number(totalRow?.count ?? 0);
  const weekCount = Number(weekRow?.count ?? 0);
  const text = taskText(task);

  async function maybeInsert(kind: keyof typeof rewardDefinitions, condition: boolean) {
    if (!condition || existing.has(kind)) return;
    const definition = rewardDefinitions[kind];
    await insertRow("rewards", {
      user_id: userId,
      kind,
      title: definition.title,
      description: definition.description,
    });
    existing.add(kind);
  }

  await maybeInsert("cleaning_champion", completedCount >= 5);
  await maybeInsert("bathroom_hero", text.includes("bathroom") && task.proof_required);
  await maybeInsert("trash_master", text.includes("trash") || text.includes("bin"));
  await maybeInsert("perfect_week", weekCount >= 3);
}

async function unlockSupabaseRewards(userId: string, task: Task) {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseAdmin();
  const { data: existingRows } = await supabase
    .from("rewards")
    .select("kind")
    .eq("user_id", userId);
  const existing = new Set((existingRows ?? []).map((row) => row.kind as string));
  const { data: histories } = await supabase
    .from("task_history")
    .select("completed_at")
    .eq("completed_by", userId);
  const now = Date.now();
  const weekCount = (histories ?? []).filter(
    (history) => now - new Date(history.completed_at as string).getTime() <= 7 * 24 * 60 * 60 * 1000,
  ).length;
  const text = taskText(task);

  async function maybeInsert(kind: keyof typeof rewardDefinitions, condition: boolean) {
    if (!condition || existing.has(kind)) return;
    const definition = rewardDefinitions[kind];
    await supabase.from("rewards").insert({
      user_id: userId,
      kind,
      title: definition.title,
      description: definition.description,
    });
    existing.add(kind);
  }

  await maybeInsert("cleaning_champion", (histories ?? []).length >= 5);
  await maybeInsert("bathroom_hero", text.includes("bathroom") && task.proof_required);
  await maybeInsert("trash_master", text.includes("trash") || text.includes("bin"));
  await maybeInsert("perfect_week", weekCount >= 3);
}

export async function POST(request: Request) {
  const limited = rateLimit(request, "task-complete", 12, 10 * 60 * 1000);
  if (limited) return limited;

  const auth = await authenticateDevice(request);
  if (auth.response) return auth.response;

  const parsed = await parseJson(request, completeTaskSchema);
  if (parsed.response) return parsed.response;

  const input = parsed.data;
  const task = await getTask(input.taskId);

  if (!task) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  const eligibility = await areaEligibilityForUser(auth.session.personId, task.location);
  const userDisplayName = eligibility.userName;
  if (eligibility.isExcluded) {
    return NextResponse.json(
      {
        error: `${userDisplayName} is excluded from ${task.location}.`,
        excluded_members: eligibility.excludedMembers,
      },
      { status: 400 },
    );
  }

  if (task.proof_required && (!input.beforeUrl || !input.afterUrl)) {
    return NextResponse.json(
      { error: "Before and after photos are required for heavy tasks." },
      { status: 400 },
    );
  }

  const proof = createProofRecommendation({
    task,
    beforeUrl: input.beforeUrl,
    afterUrl: input.afterUrl,
    area: task.location,
  });

  if (isPostgresConfigured()) {
    await updateRows("tasks", {
      status: "completed",
      completed_by: auth.session.personId,
      photo_url: input.afterUrl ?? input.beforeUrl ?? task.photo_url,
      before_photo_url: input.beforeUrl ?? null,
      after_photo_url: input.afterUrl ?? null,
    }, "id = $1", [task.id]);

    await insertRow("task_history", {
      task_id: task.id,
      assigned_person: task.assigned_person,
      completed_by: auth.session.personId,
      points_awarded: task.points,
      difficulty: task.difficulty,
      ai_proof_status: proof.status,
      notes: input.notes ?? null,
    });

    await insertRow("points_ledger", {
      user_id: auth.session.personId,
      task_id: task.id,
      points_delta: task.points,
      reason: `Completed ${task.title}`,
    });

    if (task.proof_required) {
      await insertRow("proof_images", {
        task_id: task.id,
        uploaded_by: auth.session.personId,
        before_url: input.beforeUrl ?? null,
        after_url: input.afterUrl ?? null,
        ai_status: proof.status,
        ai_feedback: proof.feedback,
        confidence_score: proof.confidence,
        cleanliness_improvement_score: proof.cleanlinessImprovementScore,
        recommendation: proof.recommendation,
      });
    }

    await insertRow("notifications", {
      recipient: task.assigned_person,
      title: `${task.title} completed`,
      body: `${userDisplayName} completed ${task.title}.`,
      type: "task",
      payload: { task_id: task.id, completed_by: auth.session.personId },
    });

    await auditLog({
      personId: auth.session.personId,
      deviceId: auth.session.deviceId,
      action: "completed_task",
      entityType: "task",
      entityId: task.id,
      metadata: { title: task.title, points: task.points, proof, notes: input.notes ?? null },
    });

    await unlockPostgresRewards(auth.session.personId, task);
  } else if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();

    await supabase
      .from("tasks")
      .update({
        status: "completed",
        completed_by: auth.session.personId,
        photo_url: input.afterUrl ?? input.beforeUrl ?? task.photo_url,
        before_photo_url: input.beforeUrl ?? null,
        after_photo_url: input.afterUrl ?? null,
      })
      .eq("id", task.id);

    await supabase.from("task_history").insert({
      task_id: task.id,
      assigned_person: task.assigned_person,
      completed_by: auth.session.personId,
      points_awarded: task.points,
      difficulty: task.difficulty,
      ai_proof_status: proof.status,
      notes: input.notes ?? null,
    });

    await supabase.from("points_ledger").insert({
      user_id: auth.session.personId,
      task_id: task.id,
      points_delta: task.points,
      reason: `Completed ${task.title}`,
    });

    if (task.proof_required) {
      await supabase.from("proof_images").insert({
        task_id: task.id,
        uploaded_by: auth.session.personId,
        before_url: input.beforeUrl ?? null,
        after_url: input.afterUrl ?? null,
        ai_status: proof.status,
        ai_feedback: proof.feedback,
        confidence_score: proof.confidence,
        cleanliness_improvement_score: proof.cleanlinessImprovementScore,
        recommendation: proof.recommendation,
      });
    }

    await supabase.from("notifications").insert({
      recipient: task.assigned_person,
      title: `${task.title} completed`,
      body: `${userDisplayName} completed ${task.title}.`,
      type: "task",
      payload: { task_id: task.id, completed_by: auth.session.personId },
    });

    await auditLog({
      personId: auth.session.personId,
      deviceId: auth.session.deviceId,
      action: "completed_task",
      entityType: "task",
      entityId: task.id,
      metadata: { title: task.title, points: task.points, proof, notes: input.notes ?? null },
    });

    await unlockSupabaseRewards(auth.session.personId, task);
  }

  return NextResponse.json({
    ok: true,
    task: {
      ...task,
      status: "completed",
      completed_by: auth.session.personId,
      before_photo_url: input.beforeUrl ?? null,
      after_photo_url: input.afterUrl ?? null,
      photo_url: input.afterUrl ?? input.beforeUrl ?? task.photo_url,
    },
    proof,
  });
}
