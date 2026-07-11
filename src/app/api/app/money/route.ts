import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, apiErrorResponse, getHouseholdApiContext } from "@/lib/saas/api";
import { recordHouseholdActivity, type HouseholdMember } from "@/lib/saas/core";
import { rateLimit } from "@/lib/server/security";
import { dbQuery, insertRow } from "@/lib/server/db";

const moneyActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("expense"),
    title: z.string().trim().min(1).max(160),
    amount: z.coerce.number().positive().max(1_000_000),
    category: z.enum(["Food", "Cleaning", "Bills", "Internet", "Electricity", "Transport", "Entertainment", "Emergency", "Other"]),
    paid_by_member_id: z.string().uuid(),
    expense_date: z.string().date(),
    notes: z.string().trim().max(1000).optional(),
    split_method: z.enum(["equal", "exact", "percentage", "shares"]).default("equal"),
    participant_ids: z.array(z.string().uuid()).min(1).max(20),
    split_values: z.record(z.string(), z.coerce.number().nonnegative()).optional(),
  }),
  z.object({
    action: z.literal("settlement"),
    paid_to_member_id: z.string().uuid(),
    amount: z.coerce.number().positive().max(1_000_000),
    method: z.enum(["cash", "bank_transfer", "other"]),
    notes: z.string().trim().max(500).optional(),
  }),
]);

function distributeCents(totalCents: number, weights: number[]) {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (totalWeight <= 0) throw new ApiError("Split values must be greater than zero.", 400);
  const raw = weights.map((weight) => (totalCents * weight) / totalWeight);
  const cents = raw.map(Math.floor);
  let remainder = totalCents - cents.reduce((sum, value) => sum + value, 0);
  const order = raw.map((value, index) => ({ index, fraction: value - Math.floor(value) })).sort((a, b) => b.fraction - a.fraction);
  for (let index = 0; remainder > 0; index = (index + 1) % order.length) {
    cents[order[index].index] += 1;
    remainder -= 1;
  }
  return cents.map((value) => value / 100);
}

function calculateSplitAmounts(input: Extract<z.infer<typeof moneyActionSchema>, { action: "expense" }>) {
  const totalCents = Math.round(input.amount * 100);
  if (input.split_method === "equal") {
    return distributeCents(totalCents, input.participant_ids.map(() => 1));
  }

  const values = input.participant_ids.map((id) => input.split_values?.[id] ?? 0);
  if (input.split_method === "percentage") {
    const total = values.reduce((sum, value) => sum + value, 0);
    if (Math.abs(total - 100) > 0.01) throw new ApiError("Percentage splits must total 100%.", 400);
    return distributeCents(totalCents, values);
  }
  if (input.split_method === "shares") return distributeCents(totalCents, values);

  const exactCents = values.map((value) => Math.round(value * 100));
  if (exactCents.reduce((sum, value) => sum + value, 0) !== totalCents) {
    throw new ApiError("Exact splits must equal the expense amount.", 400);
  }
  return exactCents.map((value) => value / 100);
}

export async function POST(request: Request) {
  const limited = rateLimit(request, "saas-money", 40, 60_000);
  if (limited) return limited;

  try {
    const context = await getHouseholdApiContext();
    const input = moneyActionSchema.parse(await request.json());
    const members = await dbQuery<Pick<HouseholdMember, "id">>(
      "select id from public.household_members where household_id = $1 and status = 'active'",
      [context.household.id],
    );
    const memberIds = new Set(members.map((member) => member.id));

    if (input.action === "settlement") {
      if (!memberIds.has(input.paid_to_member_id)) throw new ApiError("Settlement recipient is not in this household.", 400);
      if (input.paid_to_member_id === context.member.id) throw new ApiError("Choose another household member.", 400);
      const data = await insertRow<{ id: string }>("household_settlements", {
          household_id: context.household.id,
          paid_by_member_id: context.member.id,
          paid_to_member_id: input.paid_to_member_id,
          amount: input.amount,
          method: input.method,
          notes: input.notes || null,
          created_by_profile_id: context.user.id,
        });
      if (!data) throw new Error("Settlement could not be created.");
      await recordHouseholdActivity({
        householdId: context.household.id,
        actorMemberId: context.member.id,
        eventType: "settlement_created",
        title: "Recorded a settlement",
        detail: `${context.household.currency} ${input.amount.toFixed(2)} · ${input.method.replace("_", " ")}`,
        entityType: "settlement",
        entityId: data.id,
      });
      return NextResponse.json({ ok: true, id: data.id });
    }

    const uniqueParticipants = [...new Set(input.participant_ids)];
    if (uniqueParticipants.length !== input.participant_ids.length) throw new ApiError("Each participant can appear only once.", 400);
    if (!memberIds.has(input.paid_by_member_id) || uniqueParticipants.some((id) => !memberIds.has(id))) {
      throw new ApiError("Every payer and participant must belong to this household.", 400);
    }
    const splitAmounts = calculateSplitAmounts(input);

    const expense = await insertRow<{ id: string }>("household_expenses", {
        household_id: context.household.id,
        title: input.title,
        amount: input.amount,
        currency: context.household.currency,
        category: input.category,
        paid_by_member_id: input.paid_by_member_id,
        split_method: input.split_method,
        expense_date: input.expense_date,
        notes: input.notes || null,
        created_by_profile_id: context.user.id,
      });
    if (!expense) throw new Error("Expense could not be created.");

    try {
      for (const [index, memberId] of uniqueParticipants.entries()) {
        await insertRow("household_expense_splits", {
          household_id: context.household.id,
          expense_id: expense.id,
          member_id: memberId,
          owed_amount: splitAmounts[index],
        });
      }
    } catch (splitError) {
      await dbQuery("delete from public.household_expenses where id = $1 and household_id = $2", [expense.id, context.household.id]);
      throw splitError;
    }

    await recordHouseholdActivity({
      householdId: context.household.id,
      actorMemberId: context.member.id,
      eventType: "expense_created",
      title: `Added ${input.title}`,
      detail: `${context.household.currency} ${input.amount.toFixed(2)} · ${input.split_method} split`,
      entityType: "expense",
      entityId: expense.id,
    });
    return NextResponse.json({ ok: true, id: expense.id });
  } catch (error) {
    return apiErrorResponse(error, "api.app.money");
  }
}
