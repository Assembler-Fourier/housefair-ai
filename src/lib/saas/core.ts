import "server-only";

import { dbQuery, dbQueryOne, insertRow } from "@/lib/server/db";
import type { HouseholdContext } from "@/lib/saas/auth";

export type HouseholdMember = {
  id: string;
  profile_id: string | null;
  display_name: string;
  room_name: string | null;
  role: "owner" | "admin" | "member";
};

export type HouseholdTask = {
  id: string;
  title: string;
  description: string;
  area: string;
  difficulty: "easy" | "medium" | "heavy";
  difficulty_reason: string;
  estimated_minutes: number;
  points: number;
  points_reason: string;
  frequency: "once" | "daily" | "every_second_day" | "weekly" | "monthly";
  due_date: string;
  status: "pending" | "completed" | "overdue" | "deferred";
  assigned_member_id: string | null;
  completed_by_member_id: string | null;
  checklist: string[];
  completed_items: string[];
  proof_required: boolean;
  completion_notes: string | null;
  completed_at: string | null;
};

export type HouseholdGrocery = {
  id: string;
  name: string;
  category: string;
  status: "available" | "running_low" | "needed" | "bought";
  quantity: string | null;
  bought_by_member_id: string | null;
  price: number | null;
  notes: string | null;
  purchased_at: string | null;
};

export type HouseholdExpense = {
  id: string;
  title: string;
  amount: number;
  currency: string;
  category: string;
  paid_by_member_id: string;
  split_method: "equal" | "exact" | "percentage" | "shares";
  expense_date: string;
  notes: string | null;
  receipt_path: string | null;
  created_at: string;
};

export type ExpenseSplit = {
  expense_id: string;
  member_id: string;
  owed_amount: number;
};

export type HouseholdSettlement = {
  id: string;
  paid_by_member_id: string;
  paid_to_member_id: string;
  amount: number;
  method: "cash" | "bank_transfer" | "other";
  settled_at: string;
};

export type HouseholdIssue = {
  id: string;
  kind: "report" | "cleanup_request" | "reminder";
  category: string;
  location: string;
  description: string;
  reporter_member_id: string;
  person_involved_member_id: string | null;
  status: string;
  created_at: string;
};

export type HouseholdActivity = {
  id: string;
  actor_member_id: string | null;
  event_type: string;
  title: string;
  detail: string | null;
  created_at: string;
};

export type SimplifiedDebt = {
  fromMemberId: string;
  toMemberId: string;
  amount: number;
};

export type HouseholdAppData = {
  household: HouseholdContext;
  currentMember: HouseholdMember;
  members: HouseholdMember[];
  tasks: HouseholdTask[];
  groceries: HouseholdGrocery[];
  expenses: HouseholdExpense[];
  splits: ExpenseSplit[];
  settlements: HouseholdSettlement[];
  issues: HouseholdIssue[];
  activity: HouseholdActivity[];
  balances: Record<string, number>;
  debts: SimplifiedDebt[];
  houseHealth: number;
};

export async function getCurrentHouseholdMember(householdId: string, profileId: string) {
  const data = await dbQueryOne<HouseholdMember>(
    `select id, profile_id, display_name, room_name, role
       from public.household_members
      where household_id = $1 and profile_id = $2 and status = 'active'
      limit 1`,
    [householdId, profileId],
  );
  if (!data) throw new Error("Active household membership required.");
  return data;
}

function calculateBalances(
  members: HouseholdMember[],
  expenses: HouseholdExpense[],
  splits: ExpenseSplit[],
  settlements: HouseholdSettlement[],
) {
  const balances = Object.fromEntries(members.map((member) => [member.id, 0])) as Record<string, number>;
  for (const expense of expenses) balances[expense.paid_by_member_id] = (balances[expense.paid_by_member_id] ?? 0) + Number(expense.amount);
  for (const split of splits) balances[split.member_id] = (balances[split.member_id] ?? 0) - Number(split.owed_amount);
  for (const settlement of settlements) {
    balances[settlement.paid_by_member_id] = (balances[settlement.paid_by_member_id] ?? 0) + Number(settlement.amount);
    balances[settlement.paid_to_member_id] = (balances[settlement.paid_to_member_id] ?? 0) - Number(settlement.amount);
  }
  for (const memberId of Object.keys(balances)) balances[memberId] = Math.round(balances[memberId] * 100) / 100;
  return balances;
}

function simplifyDebts(balances: Record<string, number>): SimplifiedDebt[] {
  const creditors = Object.entries(balances).filter(([, value]) => value > 0.009).map(([id, value]) => ({ id, amount: value })).sort((a, b) => b.amount - a.amount);
  const debtors = Object.entries(balances).filter(([, value]) => value < -0.009).map(([id, value]) => ({ id, amount: -value })).sort((a, b) => b.amount - a.amount);
  const result: SimplifiedDebt[] = [];
  let creditorIndex = 0;
  let debtorIndex = 0;
  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];
    const amount = Math.min(creditor.amount, debtor.amount);
    if (amount > 0.009) result.push({ fromMemberId: debtor.id, toMemberId: creditor.id, amount: Math.round(amount * 100) / 100 });
    creditor.amount -= amount;
    debtor.amount -= amount;
    if (creditor.amount < 0.01) creditorIndex += 1;
    if (debtor.amount < 0.01) debtorIndex += 1;
  }
  return result;
}

export async function getHouseholdAppData(args: {
  household: HouseholdContext;
  profileId: string;
}): Promise<HouseholdAppData> {
  const householdId = args.household.id;
  const [members, tasks, groceryRows, expenseRows, splitRows, settlementRows, issues, activity] = await Promise.all([
    dbQuery<HouseholdMember>("select id, profile_id, display_name, room_name, role from public.household_members where household_id = $1 and status = 'active' order by created_at", [householdId]),
    dbQuery<HouseholdTask>("select * from public.household_tasks where household_id = $1 order by due_date, created_at", [householdId]),
    dbQuery<HouseholdGrocery>("select * from public.household_groceries where household_id = $1 order by updated_at desc", [householdId]),
    dbQuery<HouseholdExpense>("select * from public.household_expenses where household_id = $1 order by expense_date desc limit 100", [householdId]),
    dbQuery<ExpenseSplit>("select expense_id, member_id, owed_amount from public.household_expense_splits where household_id = $1", [householdId]),
    dbQuery<HouseholdSettlement>("select id, paid_by_member_id, paid_to_member_id, amount, method, settled_at from public.household_settlements where household_id = $1 order by settled_at desc limit 100", [householdId]),
    dbQuery<HouseholdIssue>("select * from public.household_issues where household_id = $1 order by created_at desc limit 50", [householdId]),
    dbQuery<HouseholdActivity>("select id, actor_member_id, event_type, title, detail, created_at from public.household_activity where household_id = $1 order by created_at desc limit 20", [householdId]),
  ]);
  const currentMember = members.find((member) => member.profile_id === args.profileId);
  if (!currentMember) throw new Error("Active household membership required.");
  const groceries = groceryRows.map((item) => ({ ...item, price: item.price === null ? null : Number(item.price) }));
  const expenses = expenseRows.map((item) => ({ ...item, amount: Number(item.amount) }));
  const splits = splitRows.map((item) => ({ ...item, owed_amount: Number(item.owed_amount) }));
  const settlements = settlementRows.map((item) => ({ ...item, amount: Number(item.amount) }));
  const balances = calculateBalances(members, expenses, splits, settlements);

  const dueTasks = tasks.filter((task) => task.status !== "completed");
  const completedTasks = tasks.filter((task) => task.status === "completed");
  const taskScore = tasks.length ? completedTasks.length / tasks.length : 1;
  const groceryPenalty = groceries.filter((item) => item.status === "needed").length * 3;
  const issuePenalty = issues.filter((issue) => issue.status !== "resolved" && issue.status !== "rejected").length * 5;
  const overduePenalty = dueTasks.filter((task) => task.due_date < new Date().toISOString().slice(0, 10)).length * 6;
  const houseHealth = Math.max(0, Math.min(100, Math.round(65 + taskScore * 35 - groceryPenalty - issuePenalty - overduePenalty)));

  return {
    household: args.household,
    currentMember,
    members,
    tasks,
    groceries,
    expenses,
    splits,
    settlements,
    issues,
    activity,
    balances,
    debts: simplifyDebts(balances),
    houseHealth,
  };
}

export async function recordHouseholdActivity(args: {
  householdId: string;
  actorMemberId: string | null;
  eventType: string;
  title: string;
  detail?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await insertRow("household_activity", {
    household_id: args.householdId,
    actor_member_id: args.actorMemberId,
    event_type: args.eventType,
    title: args.title,
    detail: args.detail ?? null,
    entity_type: args.entityType ?? null,
    entity_id: args.entityId ?? null,
    metadata: args.metadata ?? {},
  });
}
