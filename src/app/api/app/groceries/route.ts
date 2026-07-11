import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, apiErrorResponse, getHouseholdApiContext } from "@/lib/saas/api";
import { recordHouseholdActivity, type HouseholdGrocery, type HouseholdMember } from "@/lib/saas/core";
import { rateLimit } from "@/lib/server/security";
import { dbQuery, dbQueryOne, insertRow, updateRows } from "@/lib/server/db";

const groceryActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add"),
    name: z.string().trim().min(1).max(120),
    category: z.string().trim().min(1).max(80).default("Other"),
    quantity: z.string().trim().max(60).optional(),
    notes: z.string().trim().max(500).optional(),
  }),
  z.object({
    action: z.literal("set_status"),
    item_id: z.string().uuid(),
    status: z.enum(["available", "running_low", "needed"]),
  }),
  z.object({
    action: z.literal("bought"),
    item_id: z.string().uuid(),
    price: z.coerce.number().min(0).max(100000).optional(),
    add_expense: z.boolean().default(false),
  }),
]);

function equalAmounts(amount: number, count: number) {
  const totalCents = Math.round(amount * 100);
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;
  return Array.from({ length: count }, (_, index) => (base + (index < remainder ? 1 : 0)) / 100);
}

export async function POST(request: Request) {
  const limited = rateLimit(request, "saas-groceries", 60, 60_000);
  if (limited) return limited;

  try {
    const context = await getHouseholdApiContext();
    const input = groceryActionSchema.parse(await request.json());
    if (input.action === "add") {
      const existing = await dbQueryOne<{ id: string }>(
        "select id from public.household_groceries where household_id = $1 and lower(name) = lower($2) limit 1",
        [context.household.id, input.name],
      );

      if (existing) {
        await updateRows("household_groceries", { status: "needed", category: input.category, quantity: input.quantity || null, notes: input.notes || null }, "id = $1 and household_id = $2", [existing.id, context.household.id]);
        return NextResponse.json({ ok: true, id: existing.id });
      }

      const data = await insertRow<{ id: string }>("household_groceries", {
          household_id: context.household.id,
          name: input.name,
          category: input.category,
          quantity: input.quantity || null,
          notes: input.notes || null,
          status: "needed",
          added_by_member_id: context.member.id,
        });
      if (!data) throw new Error("Grocery could not be created.");
      await recordHouseholdActivity({
        householdId: context.household.id,
        actorMemberId: context.member.id,
        eventType: "grocery_added",
        title: `Added ${input.name}`,
        detail: "Added to the shared shopping list.",
        entityType: "grocery",
        entityId: data.id,
      });
      return NextResponse.json({ ok: true, id: data.id });
    }

    const item = await dbQueryOne<HouseholdGrocery>(
      "select * from public.household_groceries where id = $1 and household_id = $2 limit 1",
      [input.item_id, context.household.id],
    );
    if (!item) throw new ApiError("Grocery item not found.", 404);

    if (input.action === "set_status") {
      await updateRows("household_groceries", { status: input.status, purchased_at: null, bought_by_member_id: null }, "id = $1 and household_id = $2", [item.id, context.household.id]);
      return NextResponse.json({ ok: true });
    }

    const purchasedAt = new Date().toISOString();
    const price = input.price ?? null;
    await updateRows("household_groceries", {
        status: "bought",
        bought_by_member_id: context.member.id,
        purchased_at: purchasedAt,
        price,
      }, "id = $1 and household_id = $2", [item.id, context.household.id]);

    let expenseId: string | null = null;
    if (input.add_expense && price && price > 0) {
      const activeMembers = await dbQuery<Pick<HouseholdMember, "id">>(
        "select id from public.household_members where household_id = $1 and status = 'active' order by created_at",
        [context.household.id],
      );
      if (!activeMembers.length) throw new ApiError("No active members to split this expense with.", 400);

      const expense = await insertRow<{ id: string }>("household_expenses", {
          household_id: context.household.id,
          title: item.name,
          amount: price,
          currency: context.household.currency,
          category: "Food",
          paid_by_member_id: context.member.id,
          split_method: "equal",
          expense_date: new Date().toISOString().slice(0, 10),
          notes: "Created from a HouseFair grocery purchase.",
          created_by_profile_id: context.user.id,
        });
      if (!expense) throw new Error("Expense could not be created.");
      expenseId = expense.id;
      const amounts = equalAmounts(price, activeMembers.length);
      for (const [index, member] of activeMembers.entries()) {
        await insertRow("household_expense_splits", {
          household_id: context.household.id,
          expense_id: expense.id,
          member_id: member.id,
          owed_amount: amounts[index],
        });
      }
    }

    await recordHouseholdActivity({
      householdId: context.household.id,
      actorMemberId: context.member.id,
      eventType: "grocery_bought",
      title: `Bought ${item.name}`,
      detail: price === null ? "Marked as bought." : `${context.household.currency} ${price.toFixed(2)}${expenseId ? " · shared expense added" : ""}`,
      entityType: "grocery",
      entityId: item.id,
      metadata: { expense_id: expenseId },
    });
    return NextResponse.json({ ok: true, expense_id: expenseId });
  } catch (error) {
    return apiErrorResponse(error, "api.app.groceries");
  }
}
