import { addDays, addMonths, formatISO } from "date-fns";
import { NextResponse } from "next/server";
import { generateFairWeeklyPlan } from "@/lib/fairness-engine";
import { getHouseState } from "@/lib/data";
import { insertRow, isPostgresConfigured, updateRows } from "@/lib/server/db";
import { auditLog } from "@/lib/server/security";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { Expense, ExpenseSplit, RecurringExpense, RecurringTaskRule } from "@/lib/types";

export const runtime = "nodejs";

function isAuthorizedCronRequest(request: Request) {
  const secret = process.env.CRON_SECRET ?? process.env.HOUSEFAIR_CRON_SECRET;
  if (!secret) return false;
  return (
    request.headers.get("authorization") === `Bearer ${secret}` ||
    request.headers.get("x-housefair-cron-key") === secret
  );
}

function isRuleDue(rule: RecurringTaskRule, now = new Date()) {
  const day = now.getDay();
  if (!rule.active) return false;
  if (rule.frequency === "daily") return true;
  if (rule.frequency === "every_second_day") {
    const dayOfYear = Math.floor(
      (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    return dayOfYear % 2 === 0;
  }
  return rule.day_of_week === day;
}

function moneyAmount(value: number | string | null | undefined) {
  const amount = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function isRecurringExpenseDue(expense: RecurringExpense, today: string) {
  return expense.active && moneyAmount(expense.amount) > 0 && !!expense.paid_by && expense.next_due_date <= today;
}

function nextRecurringExpenseDate(expense: RecurringExpense, today = new Date()) {
  let cursor = new Date(`${expense.next_due_date}T12:00:00`);
  const todayMidday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);

  do {
    cursor = expense.frequency === "weekly" ? addDays(cursor, 7) : addMonths(cursor, 1);
  } while (cursor <= todayMidday);

  return formatISO(cursor, { representation: "date" });
}

function houseDateKey(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Dublin" }).format(
    new Date(value),
  );
}

function equalExpenseSplits(userIds: string[], amount: number) {
  const share = Math.round((amount / userIds.length) * 100) / 100;
  let remaining = Math.round((amount - share * userIds.length) * 100) / 100;

  return userIds.map((userId, index) => {
    const adjustment = index === 0 ? remaining : 0;
    remaining = 0;
    return {
      user_id: userId,
      split_value: null,
      amount_owed: Math.round((share + adjustment) * 100) / 100,
    };
  });
}

const recurringDetails: Record<string, { description: string; minutes: number; checklist: string[] }> = {
  "Dish duty": {
    description:
      "Everyone washes their own personal dishes. This duty covers shared mess from tea, cooking, and food prepared for multiple people.",
    minutes: 20,
    checklist: [
      "Personal plates, cups, and cutlery stay personal",
      "Wash shared tea kettle, mugs, pots, pans, and cooking utensils",
      "Clear sink and drying rack",
      "Wipe splash area around sink",
    ],
  },
  "Kitchen reset": {
    description: "Reset shared kitchen surfaces, stove splashes, shared food, crumbs, and sink area.",
    minutes: 25,
    checklist: ["Wipe counters and stove", "Put shared food away", "Reset sink and drying area", "Sweep obvious crumbs"],
  },
  "Food waste bin": {
    description: "Empty and reset the small food waste bin when it is half full, wet, or smelly.",
    minutes: 8,
    checklist: ["Empty food waste bag if half full or smelly", "Replace small white food waste bag", "Wipe lid and surrounding area"],
  },
  "Trash checks": {
    description: "Check shared bins before night and stop smells early.",
    minutes: 10,
    checklist: ["Check kitchen bin", "Check bathroom bins", "Replace liners where needed", "Move full bags outside"],
  },
  "Bathroom rotation": {
    description: "Bathroom cleaning rotation with proof for shared bathroom quality.",
    minutes: 40,
    checklist: ["Toilet cleaned", "Sink cleaned", "Mirror cleaned", "Floor cleaned", "Toilet paper checked"],
  },
};

export async function POST(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const state = await getHouseState();
  const dueRules = state.recurring_task_rules.filter((rule) => isRuleDue(rule));
  const plan = generateFairWeeklyPlan(state);
  const today = formatISO(new Date(), { representation: "date" });
  const dueMoneyRules = state.recurring_expenses.filter((expense) =>
    isRecurringExpenseDue(expense, today),
  );

  if (!isSupabaseConfigured() && !isPostgresConfigured()) {
    return NextResponse.json({
      created: dueRules.length,
      moneyCreated: dueMoneyRules.length,
      notifications: dueRules.map((rule) => rule.title),
      storage: "seed",
    });
  }

  const existingToday = new Set(
    state.tasks
      .filter((task) => houseDateKey(task.due_date) === today)
      .map((task) => `${task.title}:${task.location}`),
  );
  const existingOpen = new Set(
    state.tasks
      .filter((task) => task.status !== "completed")
      .map((task) => `${task.title}:${task.location}`),
  );
  const existingMoneyToday = new Set(
    state.expenses
      .filter((expense) => expense.paid_date === today)
      .map((expense) => `${expense.title}:${expense.paid_by}`),
  );
  const now = new Date();
  const nowIso = now.toISOString();
  const nextReminderAt = formatISO(addDays(now, 1));
  const carriedOverTasks = state.tasks.filter(
    (task) =>
      task.status !== "completed" &&
      !!task.assigned_person &&
      houseDateKey(task.due_date) < today &&
      (!task.next_reminder_at || new Date(task.next_reminder_at) <= now),
  );

  const inserts = dueRules
    .filter((rule) => {
      const key = `${rule.title}:${rule.location}`;
      return !existingToday.has(key) && !existingOpen.has(key);
    })
    .map((rule, index) => {
      const assignment = plan.assignments[index % Math.max(plan.assignments.length, 1)];
      const fallbackUser = state.users[index % Math.max(state.users.length, 1)];
      const details = recurringDetails[rule.title];

      return {
        title: rule.title,
        description: details?.description ?? `Automatically generated from recurring rule: ${rule.title}.`,
        location: rule.location,
        difficulty: rule.difficulty,
        points: rule.points,
        assigned_person: assignment?.assigned_to ?? fallbackUser?.id ?? null,
        due_date:
          rule.title === "Bring bins back"
            ? formatISO(addDays(new Date(), 1), { representation: "date" })
            : today,
        frequency: rule.frequency === "every_second_day" ? "daily" : rule.frequency,
        proof_required: rule.proof_required,
        status: "pending",
        estimated_minutes: details?.minutes ?? 15,
        checklist_items: details?.checklist ?? [],
      };
    });

  const day = new Date().getDay();
  const timedNotifications =
    day === 4
      ? [
          {
            recipient: null,
            title: "Bins tonight",
            body: "Reminder: Put bins outside tonight.",
            type: "task",
            scheduled_for: new Date().toISOString(),
            payload: { recurring: "bins_outside" },
          },
        ]
      : day === 5
        ? [
            {
              recipient: null,
              title: "Bins back",
              body: "Bring bins back this morning.",
              type: "task",
              scheduled_for: new Date().toISOString(),
              payload: { recurring: "bins_return" },
            },
          ]
        : [];
  const notifications = [
    ...timedNotifications,
    ...carriedOverTasks.map((task) => ({
      recipient: task.assigned_person,
      title: `${task.title} is still pending`,
      body: "No stress. This task is carried forward and still needs doing when you can.",
      type: "task",
      scheduled_for: nowIso,
      payload: {
        task_id: task.id,
        carried_over: true,
        deferral_count: task.deferral_count ?? 0,
      },
    })),
  ];

  if (isPostgresConfigured()) {
    await Promise.all(inserts.map((item) => insertRow("tasks", item)));
    await Promise.all(notifications.map((item) => insertRow("notifications", item)));
    await Promise.all(
      carriedOverTasks.map((task) =>
        updateRows(
          "tasks",
          {
            last_reminded_at: nowIso,
            next_reminder_at: nextReminderAt,
          },
          "id = $1",
          [task.id],
        ),
      ),
    );
    let moneyCreated = 0;

    for (const rule of dueMoneyRules) {
      if (!rule.paid_by || existingMoneyToday.has(`${rule.title}:${rule.paid_by}`)) continue;
      const amount = moneyAmount(rule.amount);
      const expense = await insertRow<Expense>("expenses", {
        group_name: "House Expenses",
        title: rule.title,
        amount,
        category: rule.category,
        paid_by: rule.paid_by,
        paid_date: today,
        notes: rule.notes ?? `Created automatically from recurring ${rule.frequency} expense.`,
        receipt_url: null,
        split_type: "equal",
        created_by: rule.paid_by,
      });
      if (!expense) continue;

      for (const split of equalExpenseSplits(state.users.map((user) => user.id), amount)) {
        await insertRow<ExpenseSplit>("expense_splits", {
          expense_id: expense.id,
          ...split,
        });
      }
      await updateRows(
        "recurring_expenses",
        { next_due_date: nextRecurringExpenseDate(rule) },
        "id = $1",
        [rule.id],
      );
      moneyCreated += 1;
    }

    await auditLog({
      personId: null,
      deviceId: "cron",
      action: "ran_recurring_scheduler",
      entityType: "recurring_task_rule",
      metadata: { created: inserts.length, moneyCreated, notifications: notifications.length },
    });

    return NextResponse.json({
      created: inserts.length,
      moneyCreated,
      notifications: notifications.length,
    });
  }

  const supabase = getSupabaseAdmin();

  if (inserts.length) {
    await supabase.from("tasks").insert(inserts);
  }

  if (notifications.length) {
    await supabase.from("notifications").insert(notifications);
  }
  if (carriedOverTasks.length) {
    await Promise.all(
      carriedOverTasks.map((task) =>
        supabase
          .from("tasks")
          .update({
            last_reminded_at: nowIso,
            next_reminder_at: nextReminderAt,
          })
          .eq("id", task.id),
      ),
    );
  }

  let moneyCreated = 0;
  for (const rule of dueMoneyRules) {
    if (!rule.paid_by || existingMoneyToday.has(`${rule.title}:${rule.paid_by}`)) continue;
    const amount = moneyAmount(rule.amount);
    const { data: expense } = await supabase
      .from("expenses")
      .insert({
        group_name: "House Expenses",
        title: rule.title,
        amount,
        category: rule.category,
        paid_by: rule.paid_by,
        paid_date: today,
        notes: rule.notes ?? `Created automatically from recurring ${rule.frequency} expense.`,
        receipt_url: null,
        split_type: "equal",
        created_by: rule.paid_by,
      })
      .select("*")
      .single();

    if (!expense) continue;

    await supabase
      .from("expense_splits")
      .insert(
        equalExpenseSplits(state.users.map((user) => user.id), amount).map((split) => ({
          expense_id: expense.id,
          ...split,
        })),
      );
    await supabase
      .from("recurring_expenses")
      .update({ next_due_date: nextRecurringExpenseDate(rule) })
      .eq("id", rule.id);
    moneyCreated += 1;
  }

  await auditLog({
    personId: null,
    deviceId: "cron",
    action: "ran_recurring_scheduler",
    entityType: "recurring_task_rule",
    metadata: { created: inserts.length, moneyCreated, notifications: notifications.length },
  });

  return NextResponse.json({
    created: inserts.length,
    moneyCreated,
    notifications: notifications.length,
  });
}

export async function GET(request: Request) {
  return POST(request);
}
