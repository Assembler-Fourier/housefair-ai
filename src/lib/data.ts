import { unstable_noStore as noStore } from "next/cache";
import type {
  AIRecommendation,
  Area,
  AvailabilityPreference,
  Complaint,
  ComplaintVote,
  Budget,
  Expense,
  ExpenseSplit,
  GroceryItem,
  GuestStatus,
  HouseAnnouncement,
  HouseNotification,
  HouseMode,
  HouseRuleAcceptance,
  HouseSetting,
  HouseState,
  HouseUser,
  PointsLedgerEntry,
  ProofImage,
  Receipt,
  RecurringTaskRule,
  RecurringExpense,
  Reward,
  Room,
  Settlement,
  Task,
  TaskHistory,
  TaskSwap,
  MoneyComment,
  ShoppingSession,
  UserPreference,
  UserDevice,
  WeeklyReport,
} from "@/lib/types";
import { memberNames } from "@/lib/types";
import { buildStats, createSeedHouseState } from "@/lib/house-data";
import { isPostgresConfigured, selectRows } from "@/lib/server/db";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

type TableName =
  | "users"
  | "rooms"
  | "areas"
  | "tasks"
  | "task_history"
  | "points_ledger"
  | "complaints"
  | "complaint_votes"
  | "groceries"
  | "notifications"
  | "availability"
  | "user_preferences"
  | "house_settings"
  | "house_rule_acceptances"
  | "weekly_reports"
  | "ai_recommendations"
  | "proof_images"
  | "user_devices"
  | "task_swaps"
  | "shopping_sessions"
  | "house_announcements"
  | "guest_status"
  | "expenses"
  | "expense_splits"
  | "settlements"
  | "recurring_expenses"
  | "budgets"
  | "money_comments"
  | "receipts"
  | "rewards"
  | "audit_logs"
  | "recurring_task_rules";

async function selectTable<T>(table: TableName, order = "created_at") {
  const supabase = getSupabaseAdmin();
  const query = supabase.from(table).select("*");
  const { data, error } =
    order === "created_at"
      ? await query.order(order, { ascending: false })
      : await query.order(order, { ascending: true });

  if (error) throw error;
  return (data ?? []) as T[];
}

async function selectPersistentTable<T>(
  table: TableName,
  order = "created_at",
) {
  if (isPostgresConfigured()) return selectRows<T>(table, order, order !== "created_at");
  return selectTable<T>(table, order);
}

export async function getHouseState(): Promise<HouseState> {
  noStore();

  if (!isSupabaseConfigured() && !isPostgresConfigured()) {
    return createSeedHouseState();
  }

  try {
    const [
      users,
      rooms,
      areas,
      tasks,
      taskHistory,
      pointsLedger,
      complaints,
      complaintVotes,
      groceries,
      notifications,
      availability,
      userPreferences,
      houseSettings,
      houseRuleAcceptances,
      weeklyReports,
      aiRecommendations,
      proofImages,
      userDevices,
      taskSwaps,
      shoppingSessions,
      houseAnnouncements,
      guestStatus,
      expenses,
      expenseSplits,
      settlements,
      recurringExpenses,
      budgets,
      moneyComments,
      receipts,
      rewards,
      auditLogs,
      recurringTaskRules,
    ] = await Promise.all([
      selectPersistentTable<HouseUser>("users", "name"),
      selectPersistentTable<Room>("rooms", "name"),
      selectPersistentTable<Area>("areas", "name"),
      selectPersistentTable<Task>("tasks", "due_date"),
      selectPersistentTable<TaskHistory>("task_history", "completed_at"),
      selectPersistentTable<PointsLedgerEntry>("points_ledger"),
      selectPersistentTable<Complaint>("complaints"),
      selectPersistentTable<ComplaintVote>("complaint_votes"),
      selectPersistentTable<GroceryItem>("groceries", "name"),
      selectPersistentTable<HouseNotification>("notifications"),
      selectPersistentTable<AvailabilityPreference>("availability", "day_of_week"),
      selectPersistentTable<UserPreference>("user_preferences", "updated_at"),
      selectPersistentTable<HouseSetting>("house_settings", "updated_at"),
      selectPersistentTable<HouseRuleAcceptance>("house_rule_acceptances", "accepted_at"),
      selectPersistentTable<WeeklyReport>("weekly_reports", "week_start"),
      selectPersistentTable<AIRecommendation>("ai_recommendations"),
      selectPersistentTable<ProofImage>("proof_images"),
      selectPersistentTable<UserDevice>("user_devices"),
      selectPersistentTable<TaskSwap>("task_swaps"),
      selectPersistentTable<ShoppingSession>("shopping_sessions", "updated_at"),
      selectPersistentTable<HouseAnnouncement>("house_announcements"),
      selectPersistentTable<GuestStatus>("guest_status", "updated_at"),
      selectPersistentTable<Expense>("expenses", "paid_date"),
      selectPersistentTable<ExpenseSplit>("expense_splits"),
      selectPersistentTable<Settlement>("settlements", "settled_at"),
      selectPersistentTable<RecurringExpense>("recurring_expenses", "next_due_date"),
      selectPersistentTable<Budget>("budgets", "category"),
      selectPersistentTable<MoneyComment>("money_comments"),
      selectPersistentTable<Receipt>("receipts"),
      selectPersistentTable<Reward>("rewards", "earned_at"),
      selectPersistentTable<HouseState["audit_logs"][number]>("audit_logs"),
      selectPersistentTable<RecurringTaskRule>("recurring_task_rules"),
    ]);

    const memberOrder = new Map(memberNames.map((name, index) => [name, index]));
    const orderedUsers = [...users].sort(
      (a, b) => (memberOrder.get(a.name) ?? 99) - (memberOrder.get(b.name) ?? 99),
    );

    const cleanliness_scores =
      (aiRecommendations.find((item) => item.type === "weekly_plan")
        ?.recommendation.cleanliness_scores as HouseState["cleanliness_scores"] | undefined) ??
      createSeedHouseState().cleanliness_scores;
    const houseMode = ((houseSettings.find((item) => item.key === "house_mode")?.value
      ?.mode as HouseMode | undefined) ?? "normal");

    const base = {
      users: orderedUsers,
      rooms,
      areas,
      tasks,
      task_history: taskHistory,
      points_ledger: pointsLedger,
      complaints,
      complaint_votes: complaintVotes,
      groceries,
      notifications,
      availability,
      user_preferences: userPreferences,
      house_settings: houseSettings,
      house_rule_acceptances: houseRuleAcceptances,
      weekly_reports: weeklyReports,
      ai_recommendations: aiRecommendations,
      proof_images: proofImages,
      user_devices: userDevices,
      task_swaps: taskSwaps,
      shopping_sessions: shoppingSessions,
      house_announcements: houseAnnouncements,
      guest_status: guestStatus,
      expenses: expenses.filter((expense) => !expense.deleted_at),
      expense_splits: expenseSplits,
      settlements,
      recurring_expenses: recurringExpenses,
      budgets,
      money_comments: moneyComments,
      receipts,
      rewards,
      audit_logs: auditLogs,
      recurring_task_rules: recurringTaskRules,
      cleanliness_scores,
      house_mode: houseMode,
    };

    return {
      ...base,
      stats: buildStats(base),
      source: isPostgresConfigured() ? "postgres" : "supabase",
    };
  } catch (error) {
    console.error("Falling back to seed data because persistent storage failed:", error);
    return createSeedHouseState();
  }
}
