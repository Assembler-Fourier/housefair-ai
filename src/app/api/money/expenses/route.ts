import { NextResponse } from "next/server";
import { z } from "zod";
import { getHouseState } from "@/lib/data";
import { auditLog, authenticateDevice, parseJson, rateLimit } from "@/lib/server/security";
import {
  dbQuery,
  insertRow,
  isPostgresConfigured,
  updateRows,
} from "@/lib/server/db";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import type {
  Expense,
  ExpenseSplit,
  MoneyCategory,
  MoneyComment,
  Receipt,
  SplitType,
} from "@/lib/types";

export const runtime = "nodejs";

const categories = [
  "Food",
  "Cleaning",
  "Bills",
  "Internet",
  "Electricity",
  "Transport",
  "Entertainment",
  "Emergency",
  "Other",
] as const;

const splitTypes = ["equal", "unequal", "percentage", "shares", "exact"] as const;

const expenseSchema = z.object({
  title: z.string().min(2).max(120),
  amount: z.coerce.number().positive(),
  category: z.enum(categories),
  paid_by: z.string().min(8),
  paid_date: z.string().min(8),
  notes: z.string().max(1000).nullable().optional(),
  receipt_url: z.string().nullable().optional(),
  comments: z.string().max(1000).nullable().optional(),
  split_type: z.enum(splitTypes).default("equal"),
  splits: z.record(z.string(), z.coerce.number()).optional(),
});

const deleteSchema = z.object({
  expenseId: z.string().min(8),
});

const updateExpenseSchema = expenseSchema.extend({
  expenseId: z.string().min(8),
});

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function buildSplits({
  userIds,
  amount,
  splitType,
  splitValues,
}: {
  userIds: string[];
  amount: number;
  splitType: SplitType;
  splitValues: Record<string, number>;
}) {
  if (splitType === "equal") {
    const share = roundMoney(amount / userIds.length);
    let remaining = roundMoney(amount - share * userIds.length);
    return userIds.map((userId, index) => {
      const adjustment = index === 0 ? remaining : 0;
      remaining = 0;
      return { user_id: userId, split_value: null, amount_owed: roundMoney(share + adjustment) };
    });
  }

  if (splitType === "percentage") {
    const total = userIds.reduce((sum, userId) => sum + (splitValues[userId] ?? 0), 0);
    if (Math.abs(total - 100) > 0.05) throw new Error("Percentage split must total 100%.");
    return userIds.map((userId) => ({
      user_id: userId,
      split_value: splitValues[userId] ?? 0,
      amount_owed: roundMoney(amount * ((splitValues[userId] ?? 0) / 100)),
    }));
  }

  if (splitType === "shares") {
    const totalShares = userIds.reduce((sum, userId) => sum + (splitValues[userId] ?? 0), 0);
    if (totalShares <= 0) throw new Error("Shares split needs at least one share.");
    return userIds.map((userId) => ({
      user_id: userId,
      split_value: splitValues[userId] ?? 0,
      amount_owed: roundMoney(amount * ((splitValues[userId] ?? 0) / totalShares)),
    }));
  }

  const rows = userIds.map((userId) => ({
    user_id: userId,
    split_value: splitValues[userId] ?? 0,
    amount_owed: roundMoney(splitValues[userId] ?? 0),
  }));
  const total = rows.reduce((sum, row) => sum + row.amount_owed, 0);
  if (Math.abs(total - amount) > 0.05) {
    throw new Error("Exact/unequal split amounts must total the expense amount.");
  }
  return rows;
}

function scanReceipt(input: {
  title: string;
  amount: number;
  category: MoneyCategory;
}) {
  return {
    store: input.title.split(" ").slice(0, 3).join(" ") || null,
    items: [],
    amount: input.amount,
    category: input.category,
    ai_summary: `Receipt scanner estimated ${input.category} at EUR ${input.amount.toFixed(2)}. Review before relying on it.`,
  };
}

export async function POST(request: Request) {
  const limited = rateLimit(request, "money-expenses", 20, 10 * 60 * 1000);
  if (limited) return limited;

  const auth = await authenticateDevice(request);
  if (auth.response) return auth.response;

  const parsed = await parseJson(request, expenseSchema);
  if (parsed.response) return parsed.response;

  const input = parsed.data;
  const state = await getHouseState();
  const userIds = state.users.map((user) => user.id);
  if (!userIds.includes(input.paid_by)) {
    return NextResponse.json({ error: "Paid by must be a house member." }, { status: 400 });
  }

  let splitRows;
  try {
    splitRows = buildSplits({
      userIds,
      amount: input.amount,
      splitType: input.split_type,
      splitValues: input.splits ?? {},
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid split." },
      { status: 400 },
    );
  }

  const expenseValues = {
    group_name: "House Expenses",
    title: input.title,
    amount: input.amount,
    category: input.category,
    paid_by: input.paid_by,
    paid_date: input.paid_date,
    notes: input.notes ?? null,
    receipt_url: input.receipt_url ?? null,
    split_type: input.split_type,
    created_by: auth.session.personId,
  };

  if (!isSupabaseConfigured() && !isPostgresConfigured()) {
    return NextResponse.json({
      expense: { id: crypto.randomUUID(), ...expenseValues, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null },
      splits: splitRows,
    });
  }

  if (isPostgresConfigured()) {
    const expense = await insertRow<Expense>("expenses", expenseValues);
    if (!expense) return NextResponse.json({ error: "Expense could not be saved." }, { status: 500 });

    const splits: ExpenseSplit[] = [];
    for (const split of splitRows) {
      const row = await insertRow<ExpenseSplit>("expense_splits", {
        expense_id: expense.id,
        ...split,
      });
      if (row) splits.push(row);
    }

    let comment: MoneyComment | null = null;
    if (input.comments) {
      comment = await insertRow<MoneyComment>("money_comments", {
        expense_id: expense.id,
        author: auth.session.personId,
        body: input.comments,
      });
    }

    let receipt: Receipt | null = null;
    if (input.receipt_url) {
      receipt = await insertRow<Receipt>("receipts", {
        expense_id: expense.id,
        uploaded_by: auth.session.personId,
        image_url: input.receipt_url,
        ...scanReceipt(input),
      });
    }

    await auditLog({
      personId: auth.session.personId,
      deviceId: auth.session.deviceId,
      action: "created_expense",
      entityType: "expense",
      entityId: expense.id,
      metadata: { title: expense.title, amount: expense.amount, split_type: expense.split_type },
    });

    return NextResponse.json({ expense, splits, comment, receipt });
  }

  const supabase = getSupabaseAdmin();
  const { data: expense, error } = await supabase
    .from("expenses")
    .insert(expenseValues)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: splits } = await supabase
    .from("expense_splits")
    .insert(splitRows.map((split) => ({ expense_id: expense.id, ...split })))
    .select("*");

  let comment = null;
  if (input.comments) {
    const { data } = await supabase
      .from("money_comments")
      .insert({ expense_id: expense.id, author: auth.session.personId, body: input.comments })
      .select("*")
      .single();
    comment = data;
  }

  let receipt = null;
  if (input.receipt_url) {
    const { data } = await supabase
      .from("receipts")
      .insert({
        expense_id: expense.id,
        uploaded_by: auth.session.personId,
        image_url: input.receipt_url,
        ...scanReceipt(input),
      })
      .select("*")
      .single();
    receipt = data;
  }

  await auditLog({
    personId: auth.session.personId,
    deviceId: auth.session.deviceId,
    action: "created_expense",
    entityType: "expense",
    entityId: expense.id,
    metadata: { title: expense.title, amount: expense.amount, split_type: expense.split_type },
  });

  return NextResponse.json({ expense, splits: splits ?? [], comment, receipt });
}

export async function DELETE(request: Request) {
  const limited = rateLimit(request, "money-expense-delete", 10, 10 * 60 * 1000);
  if (limited) return limited;

  const auth = await authenticateDevice(request);
  if (auth.response) return auth.response;

  const parsed = await parseJson(request, deleteSchema);
  if (parsed.response) return parsed.response;

  const deletedAt = new Date().toISOString();
  if (isPostgresConfigured()) {
    await updateRows("expenses", { deleted_at: deletedAt, updated_at: deletedAt }, "id = $1", [
      parsed.data.expenseId,
    ]);
  } else if (isSupabaseConfigured()) {
    await getSupabaseAdmin()
      .from("expenses")
      .update({ deleted_at: deletedAt, updated_at: deletedAt })
      .eq("id", parsed.data.expenseId);
  }

  await auditLog({
    personId: auth.session.personId,
    deviceId: auth.session.deviceId,
    action: "deleted_expense",
    entityType: "expense",
    entityId: parsed.data.expenseId,
  });

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const limited = rateLimit(request, "money-expense-edit", 12, 10 * 60 * 1000);
  if (limited) return limited;

  const auth = await authenticateDevice(request);
  if (auth.response) return auth.response;

  const parsed = await parseJson(request, updateExpenseSchema);
  if (parsed.response) return parsed.response;

  const input = parsed.data;
  const state = await getHouseState();
  const userIds = state.users.map((user) => user.id);
  if (!userIds.includes(input.paid_by)) {
    return NextResponse.json({ error: "Paid by must be a house member." }, { status: 400 });
  }

  let splitRows;
  try {
    splitRows = buildSplits({
      userIds,
      amount: input.amount,
      splitType: input.split_type,
      splitValues: input.splits ?? {},
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid split." },
      { status: 400 },
    );
  }

  const patch = {
    title: input.title,
    amount: input.amount,
    category: input.category,
    paid_by: input.paid_by,
    paid_date: input.paid_date,
    notes: input.notes ?? null,
    receipt_url: input.receipt_url ?? null,
    split_type: input.split_type,
    updated_at: new Date().toISOString(),
  };

  if (isPostgresConfigured()) {
    const [expense] = await updateRows<Expense>("expenses", patch, "id = $1", [input.expenseId]);
    if (!expense) {
      return NextResponse.json({ error: "Expense not found." }, { status: 404 });
    }
    await dbQuery("delete from public.expense_splits where expense_id = $1", [input.expenseId]);
    const splits: ExpenseSplit[] = [];
    for (const split of splitRows) {
      const row = await insertRow<ExpenseSplit>("expense_splits", {
        expense_id: input.expenseId,
        ...split,
      });
      if (row) splits.push(row);
    }
    await auditLog({
      personId: auth.session.personId,
      deviceId: auth.session.deviceId,
      action: "edited_expense",
      entityType: "expense",
      entityId: input.expenseId,
      metadata: { title: input.title, amount: input.amount },
    });
    return NextResponse.json({ expense, splits });
  }

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data: expense, error } = await supabase
      .from("expenses")
      .update(patch)
      .eq("id", input.expenseId)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await supabase.from("expense_splits").delete().eq("expense_id", input.expenseId);
    const { data: splits } = await supabase
      .from("expense_splits")
      .insert(splitRows.map((split) => ({ expense_id: input.expenseId, ...split })))
      .select("*");
    await auditLog({
      personId: auth.session.personId,
      deviceId: auth.session.deviceId,
      action: "edited_expense",
      entityType: "expense",
      entityId: input.expenseId,
      metadata: { title: input.title, amount: input.amount },
    });
    return NextResponse.json({ expense, splits: splits ?? [] });
  }

  const now = new Date().toISOString();
  return NextResponse.json({
    expense: {
      id: input.expenseId,
      group_name: "House Expenses",
      ...patch,
      created_by: auth.session.personId,
      created_at: now,
      deleted_at: null,
    },
    splits: splitRows.map((split) => ({
      id: crypto.randomUUID(),
      expense_id: input.expenseId,
      ...split,
      created_at: now,
    })),
  });
}
