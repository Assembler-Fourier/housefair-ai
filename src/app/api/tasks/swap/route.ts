import { NextResponse } from "next/server";
import { z } from "zod";
import {
  auditLog,
  authenticateDevice,
  parseJson,
  rateLimit,
} from "@/lib/server/security";
import {
  dbQueryOne,
  insertRow,
  isPostgresConfigured,
  updateRows,
} from "@/lib/server/db";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { TaskSwap } from "@/lib/types";

export const runtime = "nodejs";

const swapSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("request"),
    taskId: z.string(),
    reason: z.string().max(280).optional(),
  }),
  z.object({
    action: z.enum(["accept", "decline", "cancel"]),
    swapId: z.string(),
  }),
]);

async function getUserName(userId: string) {
  if (isPostgresConfigured()) {
    const data = await dbQueryOne<{ name: string }>(
      "select name from public.users where id = $1 limit 1",
      [userId],
    );
    return data?.name ?? "A housemate";
  }

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("users")
    .select("name")
    .eq("id", userId)
    .single();

  return (data?.name as string | undefined) ?? "A housemate";
}

export async function POST(request: Request) {
  const limited = rateLimit(request, "task-swap", 10, 60 * 60 * 1000);
  if (limited) return limited;

  const auth = await authenticateDevice(request);
  if (auth.response) return auth.response;

  const parsed = await parseJson(request, swapSchema);
  if (parsed.response) return parsed.response;

  const input = parsed.data;

  if (!isSupabaseConfigured() && !isPostgresConfigured()) {
    return NextResponse.json({
      swap: {
        id: crypto.randomUUID(),
        task_id: input.action === "request" ? input.taskId : "seed-task",
        requested_by: auth.session.personId,
        accepted_by: input.action === "accept" ? auth.session.personId : null,
        status:
          input.action === "accept"
            ? "accepted"
            : input.action === "cancel"
              ? "cancelled"
              : input.action === "decline"
                ? "declined"
                : "requested",
        reason: input.action === "request" ? input.reason ?? null : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
  }

  if (input.action === "request") {
    if (isPostgresConfigured()) {
      const data = await insertRow<TaskSwap>("task_swaps", {
        task_id: input.taskId,
        requested_by: auth.session.personId,
        reason: input.reason ?? null,
        status: "requested",
      });

      if (!data) {
        return NextResponse.json({ error: "Swap request could not be saved." }, { status: 500 });
      }

      await insertRow("notifications", {
        recipient: null,
        title: "Task swap requested",
        body: "A housemate requested help with a task swap.",
        type: "task",
        payload: { swap_id: data.id, task_id: data.task_id },
      });

      await auditLog({
        personId: auth.session.personId,
        deviceId: auth.session.deviceId,
        action: "requested_task_swap",
        entityType: "task_swap",
        entityId: data.id,
        metadata: { task_id: data.task_id },
      });

      return NextResponse.json({ swap: data });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("task_swaps")
      .insert({
        task_id: input.taskId,
        requested_by: auth.session.personId,
        reason: input.reason ?? null,
        status: "requested",
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase.from("notifications").insert({
      recipient: null,
      title: "Task swap requested",
      body: "A housemate requested help with a task swap.",
      type: "task",
      payload: { swap_id: data.id, task_id: data.task_id },
    });

    await auditLog({
      personId: auth.session.personId,
      deviceId: auth.session.deviceId,
      action: "requested_task_swap",
      entityType: "task_swap",
      entityId: data.id,
      metadata: { task_id: data.task_id },
    });

    return NextResponse.json({ swap: data });
  }

  if (isPostgresConfigured()) {
    const swap = await dbQueryOne<
      TaskSwap & { task_location: string | null; task_id: string }
    >(
      `select task_swaps.*, tasks.location as task_location
       from public.task_swaps
       join public.tasks on tasks.id = task_swaps.task_id
       where task_swaps.id = $1
       limit 1`,
      [input.swapId],
    );

    if (!swap) {
      return NextResponse.json({ error: "Swap request not found." }, { status: 404 });
    }
    if (swap.status !== "requested") {
      return NextResponse.json({ error: "This swap is no longer open." }, { status: 409 });
    }
    if (input.action === "cancel" && swap.requested_by !== auth.session.personId) {
      return NextResponse.json({ error: "Only the requester can cancel this swap." }, { status: 403 });
    }
    if (input.action === "accept" && swap.requested_by === auth.session.personId) {
      return NextResponse.json({ error: "Another housemate must accept your swap." }, { status: 400 });
    }

    if (input.action === "accept") {
      const personName = await getUserName(auth.session.personId);
      if (swap.task_location === "Top floor bathroom" && personName === "Blair") {
        return NextResponse.json(
          { error: "Blair is excluded from top floor bathroom cleaning." },
          { status: 400 },
        );
      }

      await updateRows("task_swaps", {
        accepted_by: auth.session.personId,
        status: "accepted",
        updated_at: new Date().toISOString(),
      }, "id = $1", [input.swapId]);

      await updateRows("tasks", { assigned_person: auth.session.personId }, "id = $1", [
        swap.task_id,
      ]);
    } else {
      await updateRows("task_swaps", {
        status: input.action === "decline" ? "declined" : "cancelled",
        updated_at: new Date().toISOString(),
      }, "id = $1", [input.swapId]);
    }

    await auditLog({
      personId: auth.session.personId,
      deviceId: auth.session.deviceId,
      action: `${input.action}_task_swap`,
      entityType: "task_swap",
      entityId: input.swapId,
    });

    return NextResponse.json({ ok: true, status: input.action });
  }

  const supabase = getSupabaseAdmin();
  const { data: swap, error: swapError } = await supabase
    .from("task_swaps")
    .select("*, tasks(*)")
    .eq("id", input.swapId)
    .single();

  if (swapError || !swap) {
    return NextResponse.json({ error: "Swap request not found." }, { status: 404 });
  }
  if (swap.status !== "requested") {
    return NextResponse.json({ error: "This swap is no longer open." }, { status: 409 });
  }
  if (input.action === "cancel" && swap.requested_by !== auth.session.personId) {
    return NextResponse.json({ error: "Only the requester can cancel this swap." }, { status: 403 });
  }
  if (input.action === "accept" && swap.requested_by === auth.session.personId) {
    return NextResponse.json({ error: "Another housemate must accept your swap." }, { status: 400 });
  }

  if (input.action === "accept") {
    const personName = await getUserName(auth.session.personId);
    const task = swap.tasks as { location?: string } | null;
    if (task?.location === "Top floor bathroom" && personName === "Blair") {
      return NextResponse.json(
        { error: "Blair is excluded from top floor bathroom cleaning." },
        { status: 400 },
      );
    }

    await supabase
      .from("task_swaps")
      .update({
        accepted_by: auth.session.personId,
        status: "accepted",
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.swapId);

    await supabase
      .from("tasks")
      .update({ assigned_person: auth.session.personId })
      .eq("id", swap.task_id);
  } else {
    await supabase
      .from("task_swaps")
      .update({
        status: input.action === "decline" ? "declined" : "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.swapId);
  }

  await auditLog({
    personId: auth.session.personId,
    deviceId: auth.session.deviceId,
    action: `${input.action}_task_swap`,
    entityType: "task_swap",
    entityId: input.swapId,
  });

  return NextResponse.json({ ok: true, status: input.action });
}
