"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Archive,
  Bell,
  Brain,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  CreditCard,
  Euro,
  FileDown,
  Home,
  LayoutDashboard,
  ListChecks,
  Loader2,
  Megaphone,
  MessageCircle,
  Pencil,
  PieChart,
  Plus,
  RefreshCcw,
  Receipt,
  Settings,
  ShieldCheck,
  ShoppingBasket,
  Sparkles,
  SunMoon,
  ThumbsDown,
  ThumbsUp,
  Trophy,
  Trash2,
  Upload,
  Users,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/form-fields";
import { Progress, ProgressRing } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  Complaint,
  ComplaintCategory,
  ComplaintIssueType,
  Budget,
  Expense,
  ExpenseSplit,
  GroceryItem,
  GroceryStatus,
  GuestStatus,
  HouseAnnouncement,
  HouseState,
  HouseUser,
  MoneyCategory,
  MoneyComment,
  Receipt as MoneyReceipt,
  Settlement,
  SettlementMethod,
  ShoppingSession,
  SplitType,
  Task,
  TaskDifficulty,
  TaskStylePreference,
  WeeklyPlan,
  WeeklyReport,
} from "@/lib/types";
import { cn, formatCurrency, relativeDay } from "@/lib/utils";

type View = "today" | "tasks" | "money" | "groceries" | "more";
type DialogName =
  | "complete"
  | "complaint"
  | "grocery"
  | "announcement"
  | "guests"
  | "barcode"
  | "setup"
  | "money-expense"
  | "money-settlement"
  | "money-budget"
  | null;
type DeviceIdentity = { deviceId: string; personId: string; expiresAt?: string };
type DeviceSession = DeviceIdentity & { sessionToken: string; verifiedAt: string };
type QueuedAction = {
  id: string;
  endpoint: string;
  body: unknown;
  createdAt: string;
  label: string;
};

const navItems: Array<{
  id: View;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "today", label: "Today", shortLabel: "Today", icon: LayoutDashboard },
  { id: "tasks", label: "Tasks", shortLabel: "Tasks", icon: ListChecks },
  { id: "money", label: "Money", shortLabel: "Money", icon: CreditCard },
  { id: "groceries", label: "Groceries", shortLabel: "Groceries", icon: ShoppingBasket },
  { id: "more", label: "More", shortLabel: "More", icon: Home },
];

const complaintCategories: ComplaintCategory[] = [
  "Dirty dishes",
  "Kitchen mess",
  "Bathroom mess",
  "Trash issue",
  "Noise",
  "Guest issue",
  "Missed task",
  "Other",
];

const statusLabels: Record<GroceryStatus, string> = {
  available: "Available",
  running_low: "Running low",
  needed: "Needed",
  bought: "Bought",
};

const issueTypeLabels: Record<ComplaintIssueType, string> = {
  report: "Report issue",
  cleanup_request: "Request cleanup",
  reminder: "Reminder",
};

const moneyCategories: MoneyCategory[] = [
  "Food",
  "Cleaning",
  "Bills",
  "Internet",
  "Electricity",
  "Transport",
  "Entertainment",
  "Emergency",
  "Other",
];

const splitTypeLabels: Record<SplitType, string> = {
  equal: "Equal split",
  unequal: "Unequal split",
  percentage: "Percentage split",
  shares: "Shares split",
  exact: "Exact amount split",
};

const settlementLabels: Record<SettlementMethod, string> = {
  cash: "Cash payment",
  bank_transfer: "Bank transfer",
  other: "Other",
};

const taskStyleLabels: Record<TaskStylePreference, string> = {
  heavy: "Heavy tasks",
  light: "Light tasks",
  weekend: "Weekend tasks",
  evening: "Evening tasks",
};

const houseModeLabels: Record<HouseState["house_mode"], string> = {
  normal: "Normal",
  guests_coming: "Guests Coming",
  deep_clean_week: "Deep Clean Week",
  party_mode: "Party Mode",
};

const houseModeNotes: Record<HouseState["house_mode"], string> = {
  normal: "Balanced daily fairness.",
  guests_coming: "AI prioritizes bathrooms, kitchen, bins, and visible shared areas.",
  deep_clean_week: "AI gives more weight to heavy and neglected-area routines.",
  party_mode: "AI prioritizes bins, kitchen reset, floor recovery, and next-day cleanup.",
};

const bathroomChecklist = [
  "Toilet cleaned",
  "Sink cleaned",
  "Mirror cleaned",
  "Floor cleaned",
  "Toilet paper checked",
];

const fallbackTaskDetails: Record<string, { checklist: string[]; minutes: number }> = {
  "Dish duty": {
    minutes: 20,
    checklist: [
      "Personal dishes stay personal: everyone washes their own plate, cup, and cutlery",
      "Wash shared tea kettle, mugs, utensils, and pans used by multiple people",
      "Clear sink and drying rack",
      "Wipe splash area around sink",
    ],
  },
  "Kitchen reset": {
    minutes: 25,
    checklist: [
      "Wipe counters and stove",
      "Put shared food away",
      "Reset sink and drying area",
      "Sweep obvious crumbs",
    ],
  },
  "Food waste bin": {
    minutes: 8,
    checklist: [
      "Empty food waste bag if half full or smelly",
      "Replace small white food waste bag",
      "Wipe lid and surrounding area",
    ],
  },
  "Trash checks": {
    minutes: 10,
    checklist: [
      "Check kitchen bin",
      "Check bathroom bins",
      "Replace liners where needed",
      "Move full bags outside",
    ],
  },
  "Clean ground floor bathroom": { minutes: 35, checklist: bathroomChecklist },
  "Clean top floor bathroom": { minutes: 40, checklist: bathroomChecklist },
  "Vacuum and mop ground floor": {
    minutes: 45,
    checklist: [
      "Vacuum TV/main room",
      "Vacuum kitchen edges",
      "Mop ground floor",
      "Move visible clutter before cleaning",
    ],
  },
  "Clean stairs": {
    minutes: 18,
    checklist: ["Vacuum stairs", "Wipe rail", "Clear items left on steps"],
  },
  "Clean hallway": {
    minutes: 20,
    checklist: ["Vacuum hallway", "Clear shared clutter", "Wipe visible marks"],
  },
  "Kitchen deep clean": {
    minutes: 55,
    checklist: [
      "Clean shelves and expired food",
      "Scrub sink and taps",
      "Wipe appliances",
      "Clean stove and floor edges",
    ],
  },
  "Deep cleaning rotation": {
    minutes: 75,
    checklist: [
      "Pick one neglected shared area",
      "Move items and clean behind them",
      "Wipe skirting/edges",
      "Take before and after photos",
    ],
  },
};

function taskChecklist(task: Task) {
  return task.checklist_items?.length
    ? task.checklist_items
    : (fallbackTaskDetails[task.title]?.checklist ?? [task.description]);
}

function taskMinutes(task: Task) {
  return task.estimated_minutes ?? fallbackTaskDetails[task.title]?.minutes ?? 15;
}

function difficultyExplanation(task: Task) {
  if (task.difficulty === "heavy") {
    return "Heavy task: more time, shared visibility, or before/after proof.";
  }
  if (task.difficulty === "medium") {
    return "Medium task: meaningful shared-area reset without full deep cleaning.";
  }
  return "Light task: small daily reset that prevents bigger mess later.";
}

function pointsExplanation(task: Task) {
  return `+${task.points} because this is a ${task.difficulty} ${taskMinutes(task)} minute routine in ${task.location}.`;
}

function dateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function taskDueKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : dateKey(new Date(value));
}

function isTaskCarriedOver(task: Task, today = dateKey(new Date())) {
  return (
    task.status !== "completed" &&
    ((task.deferral_count ?? 0) > 0 || taskDueKey(task.due_date) < today)
  );
}

function isOpenDueTask(task: Task, today = dateKey(new Date())) {
  return task.status !== "completed" && taskDueKey(task.due_date) <= today;
}

function dayLabel(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function taskWhatsAppUrl(state: HouseState, task: Task) {
  const assignee = userName(state, task.assigned_person);
  const due = relativeDay(task.due_date);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://housefair.app";
  const text = [
    "HouseFair reminder",
    `${assignee}: ${task.title}`,
    `${task.location} - ${taskMinutes(task)} min - +${task.points} points`,
    `Due: ${due}`,
    task.defer_reason ? `Note: ${task.defer_reason}` : null,
    `Open HouseFair: ${siteUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

function moneyValue(value: number | string | null | undefined) {
  if (value === null || value === undefined) return 0;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function currentMonthKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function calculateMoneySummary(state: HouseState) {
  const balances = new Map(state.users.map((user) => [user.id, 0]));
  const activeExpenses = state.expenses.filter((expense) => !expense.deleted_at);
  const splitsByExpense = new Map<string, ExpenseSplit[]>();

  for (const split of state.expense_splits) {
    const rows = splitsByExpense.get(split.expense_id) ?? [];
    rows.push(split);
    splitsByExpense.set(split.expense_id, rows);
  }

  for (const expense of activeExpenses) {
    balances.set(expense.paid_by, (balances.get(expense.paid_by) ?? 0) + moneyValue(expense.amount));
    for (const split of splitsByExpense.get(expense.id) ?? []) {
      balances.set(split.user_id, (balances.get(split.user_id) ?? 0) - moneyValue(split.amount_owed));
    }
  }

  for (const settlement of state.settlements) {
    const amount = moneyValue(settlement.amount);
    balances.set(settlement.payer, (balances.get(settlement.payer) ?? 0) + amount);
    balances.set(settlement.receiver, (balances.get(settlement.receiver) ?? 0) - amount);
  }

  const debtors = [...balances.entries()]
    .filter(([, value]) => value < -0.01)
    .map(([userId, value]) => ({ userId, amount: Math.abs(value) }))
    .sort((a, b) => b.amount - a.amount);
  const creditors = [...balances.entries()]
    .filter(([, value]) => value > 0.01)
    .map(([userId, value]) => ({ userId, amount: value }))
    .sort((a, b) => b.amount - a.amount);

  const simplified: Array<{ from: string; to: string; amount: number }> = [];
  let debtorIndex = 0;
  let creditorIndex = 0;
  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = Math.min(debtor.amount, creditor.amount);
    if (amount > 0.01) {
      simplified.push({ from: debtor.userId, to: creditor.userId, amount: Math.round(amount * 100) / 100 });
    }
    debtor.amount -= amount;
    creditor.amount -= amount;
    if (debtor.amount <= 0.01) debtorIndex += 1;
    if (creditor.amount <= 0.01) creditorIndex += 1;
  }

  const month = currentMonthKey();
  const monthlyExpenses = activeExpenses.filter((expense) => taskDueKey(expense.paid_date)!.startsWith(month));
  const categoryTotals = moneyCategories.map((category) => ({
    category,
    total: monthlyExpenses
      .filter((expense) => expense.category === category)
      .reduce((total, expense) => total + moneyValue(expense.amount), 0),
  }));
  const totalMonthly = categoryTotals.reduce((total, item) => total + item.total, 0);
  const paidByUser = state.users.map((user) => ({
    user_id: user.id,
    total: monthlyExpenses
      .filter((expense) => expense.paid_by === user.id)
      .reduce((total, expense) => total + moneyValue(expense.amount), 0),
  }));
  const outstanding = simplified.reduce((total, item) => total + item.amount, 0);
  const score = Math.round(Math.max(0, Math.min(100, 100 - outstanding * 1.5 + state.settlements.length * 2)));

  return {
    balances,
    simplified,
    monthlyExpenses,
    categoryTotals,
    totalMonthly,
    paidByUser,
    outstanding,
    score,
  };
}

function groceryConsumptionPredictions(state: HouseState) {
  const fallback: Record<string, number> = {
    Milk: 4,
    Bread: 5,
    Eggs: 7,
    "Tissue rolls": 14,
    "Bin bags": 21,
    "Dishwashing liquid": 18,
  };

  return state.groceries.slice(0, 8).map((item) => {
    const boughtSignals = state.audit_logs.filter(
      (log) =>
        log.action.includes("grocery") &&
        JSON.stringify(log.metadata).toLowerCase().includes(item.name.toLowerCase()),
    ).length;
    const days = fallback[item.name] ?? (boughtSignals >= 2 ? 7 : 10);
    return {
      item,
      days,
      confidence: item.status === "needed" ? 92 : item.status === "running_low" ? 84 : 68,
      message:
        item.name === "Milk"
          ? `Milk usually finishes every ${days} days.`
          : `${item.name} is estimated on a ${days} day restock rhythm.`,
    };
  });
}

type ActivityTone = "task" | "money" | "grocery" | "issue" | "system";
type ActivityItem = {
  id: string;
  tone: ActivityTone;
  title: string;
  body: string;
  at: string;
  icon: React.ComponentType<{ className?: string }>;
};

function userPointsFromLedger(state: HouseState, userId: string) {
  const user = userById(state, userId);
  return state.points_ledger
    .filter((entry) => entry.user_id === userId)
    .reduce((total, entry) => total + entry.points_delta, user?.current_points ?? 0);
}

function profileLevel(points: number, taskCount: number) {
  if (points >= 120 || taskCount >= 18) {
    return { level: 4, title: "House Legend", next: null, progress: 100 };
  }
  if (points >= 60 || taskCount >= 9) {
    return { level: 3, title: "Cleaning Hero", next: "House Legend", progress: Math.min(99, Math.round((points / 120) * 100)) };
  }
  if (points >= 20 || taskCount >= 3) {
    return { level: 2, title: "Helpful Housemate", next: "Cleaning Hero", progress: Math.min(99, Math.round((points / 60) * 100)) };
  }
  return { level: 1, title: "New Resident", next: "Helpful Housemate", progress: Math.min(99, Math.round((points / 20) * 100)) };
}

function rewardLabel(kind: string) {
  return kind
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function userMoneyContribution(state: HouseState, userId: string, monthOnly = true) {
  const month = currentMonthKey();
  return state.expenses
    .filter((expense) => !expense.deleted_at)
    .filter((expense) => expense.paid_by === userId)
    .filter((expense) => (monthOnly ? taskDueKey(expense.paid_date).startsWith(month) : true))
    .reduce((total, expense) => total + moneyValue(expense.amount), 0);
}

function activityFeed(state: HouseState, limit = 10): ActivityItem[] {
  const taskItems: ActivityItem[] = state.task_history.map((history) => {
    const task = state.tasks.find((item) => item.id === history.task_id);
    return {
      id: `task-${history.id}`,
      tone: "task",
      icon: Check,
      title: `${userName(state, history.completed_by)} completed ${task?.title ?? "a task"}`,
      body: `${history.difficulty} work - +${history.points_awarded} points${history.notes ? ` - ${history.notes}` : ""}`,
      at: history.completed_at,
    };
  });

  const expenseItems: ActivityItem[] = state.expenses
    .filter((expense) => !expense.deleted_at)
    .map((expense) => ({
      id: `expense-${expense.id}`,
      tone: "money",
      icon: Euro,
      title: `${userName(state, expense.paid_by)} paid ${formatCurrency(expense.amount)}`,
      body: `${expense.title} - ${expense.category}`,
      at: expense.created_at ?? expense.paid_date,
    }));

  const groceryItems: ActivityItem[] = state.groceries
    .filter((item) => item.status === "bought" || item.status === "needed" || item.status === "running_low")
    .map((item) => ({
      id: `grocery-${item.id}`,
      tone: "grocery",
      icon: ShoppingBasket,
      title: `${item.name} marked ${statusLabels[item.status].toLowerCase()}`,
      body: item.bought_by ? `Handled by ${userName(state, item.bought_by)}` : item.category,
      at: item.created_at ?? item.date,
    }));

  const issueItems: ActivityItem[] = state.complaints.map((complaint) => ({
    id: `issue-${complaint.id}`,
    tone: "issue",
    icon: AlertTriangle,
    title: `${issueTypeLabels[complaint.issue_type ?? "report"]}: ${complaint.category}`,
    body: `${complaint.location} - ${complaint.status}`,
    at: complaint.created_at,
  }));

  const settlementItems: ActivityItem[] = state.settlements.map((settlement) => ({
    id: `settlement-${settlement.id}`,
    tone: "money",
    icon: Receipt,
    title: `${userName(state, settlement.payer)} settled ${formatCurrency(settlement.amount)}`,
    body: `Paid to ${userName(state, settlement.receiver)} by ${settlementLabels[settlement.method].toLowerCase()}`,
    at: settlement.created_at ?? settlement.settled_at,
  }));

  return [...taskItems, ...expenseItems, ...groceryItems, ...issueItems, ...settlementItems]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit);
}

function smartReminders(state: HouseState, currentUser: HouseUser) {
  const today = dateKey(new Date());
  const money = calculateMoneySummary(state);
  const myDebt = money.simplified.find((item) => item.from === currentUser.id);
  const dueTask = state.tasks.find(
    (task) => task.assigned_person === currentUser.id && isOpenDueTask(task, today),
  );
  const prediction = groceryConsumptionPredictions(state).find(
    (item) => item.item.status === "needed" || item.item.status === "running_low" || item.confidence >= 84,
  );

  return [
    dueTask
      ? {
          id: `task-${dueTask.id}`,
          icon: Clock,
          title: `${dueTask.title} is due`,
          body: `${dueTask.title} takes about ${taskMinutes(dueTask)} minutes. Carry it over if work gets in the way.`,
        }
      : null,
    myDebt
      ? {
          id: "money-debt",
          icon: Euro,
          title: `You owe ${formatCurrency(myDebt.amount)}`,
          body: `Settle with ${userName(state, myDebt.to)} when convenient.`,
        }
      : null,
    prediction
      ? {
          id: `grocery-${prediction.item.id}`,
          icon: ShoppingBasket,
          title: `${prediction.item.name} may need checking`,
          body: prediction.message,
        }
      : null,
  ].filter(Boolean) as Array<{
    id: string;
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    body: string;
  }>;
}

function groupedNotifications(state: HouseState, currentUser: HouseUser) {
  const today = dateKey(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = dateKey(yesterdayDate);
  const visible = state.notifications
    .filter((item) => !item.recipient || item.recipient === currentUser.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return {
    Today: visible.filter((item) => taskDueKey(item.created_at) === today),
    Yesterday: visible.filter((item) => taskDueKey(item.created_at) === yesterday),
    Earlier: visible.filter((item) => ![today, yesterday].includes(taskDueKey(item.created_at))),
  };
}

function setupSetting(state: HouseState) {
  return state.house_settings.find((item) => item.key === "launch_setup")?.value ?? {};
}

function downloadBlob(filename: string, content: BlobPart, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function stateToCsv(state: HouseState) {
  const rows = [
    ["section", "date", "person", "title", "amount_or_points", "status"],
    ...state.task_history.map((history) => [
      "task_history",
      history.completed_at,
      userName(state, history.completed_by),
      state.tasks.find((task) => task.id === history.task_id)?.title ?? history.task_id,
      String(history.points_awarded),
      history.ai_proof_status ?? "",
    ]),
    ...state.expenses.map((expense) => [
      "expenses",
      expense.paid_date,
      userName(state, expense.paid_by),
      expense.title,
      String(expense.amount),
      expense.deleted_at ? "deleted" : "active",
    ]),
    ...state.groceries.map((item) => [
      "groceries",
      item.date,
      userName(state, item.bought_by ?? item.added_by),
      item.name,
      item.price ? String(item.price) : "",
      item.status,
    ]),
    ...state.complaints.map((complaint) => [
      "house_issues",
      complaint.created_at,
      userName(state, complaint.reporter),
      complaint.category,
      "",
      complaint.status,
    ]),
  ];

  return rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? "").replaceAll("\"", "\"\"")}"`)
        .join(","),
    )
    .join("\n");
}

function simplePdf(lines: string[]) {
  const pageLines = lines.slice(0, 34);
  const stream = pageLines
    .map((line, index) => {
      const safe = line.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
      return `BT /F1 11 Tf 42 ${780 - index * 21} Td (${safe}) Tj ET`;
    })
    .join("\n");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`,
  ];
  let offset = "%PDF-1.4\n".length;
  const xref = ["0000000000 65535 f "];
  const body = objects
    .map((object) => {
      xref.push(`${String(offset).padStart(10, "0")} 00000 n `);
      offset += object.length + 1;
      return object;
    })
    .join("\n");
  const xrefStart = offset;
  return `%PDF-1.4\n${body}\nxref\n0 ${xref.length}\n${xref.join("\n")}\ntrailer << /Size ${xref.length} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
}

function exportPdfSummary(state: HouseState) {
  const money = calculateMoneySummary(state);
  const lines = [
    "HouseFair AI Backup Report",
    `Backup timestamp: ${new Date().toISOString()}`,
    `Members: ${state.users.map((user) => user.name).join(", ")}`,
    `House health: ${state.stats.house_cleanliness}%`,
    `Pending tasks: ${state.stats.pending_tasks}`,
    `Open issues: ${state.stats.open_complaints}`,
    `Groceries needing attention: ${state.stats.grocery_alerts}`,
    `Monthly spending: ${formatCurrency(money.totalMonthly)}`,
    `Outstanding money: ${formatCurrency(money.outstanding)}`,
    "",
    "Recent activity:",
    ...activityFeed(state, 18).map((item) => `${relativeDay(item.at)} - ${item.title} - ${item.body}`),
  ];
  return simplePdf(lines);
}

function moneyAnswer(state: HouseState, prompt: string) {
  const summary = calculateMoneySummary(state);
  const text = prompt.toLowerCase();
  const mostOwed = [...summary.balances.entries()].sort((a, b) => a[1] - b[1])[0];
  const paidMost = [...summary.paidByUser].sort((a, b) => b.total - a.total)[0];

  if (text.includes("owe")) {
    return mostOwed && mostOwed[1] < -0.01
      ? `${userName(state, mostOwed[0])} owes the most right now: ${formatCurrency(Math.abs(mostOwed[1]))}.`
      : "Nobody owes anything right now.";
  }
  if (text.includes("spend") || text.includes("month")) {
    return `This month the house has logged ${formatCurrency(summary.totalMonthly)} across ${summary.monthlyExpenses.length} expenses.`;
  }
  if (text.includes("paid")) {
    return paidMost && paidMost.total > 0
      ? `${userName(state, paidMost.user_id)} paid the most this month: ${formatCurrency(paidMost.total)}.`
      : "No one has paid a logged expense this month yet.";
  }
  if (text.includes("report")) {
    const top = [...summary.categoryTotals].sort((a, b) => b.total - a.total).slice(0, 3);
    return `Money report: total ${formatCurrency(summary.totalMonthly)}, outstanding ${formatCurrency(summary.outstanding)}, top categories ${top.map((item) => `${item.category} ${formatCurrency(item.total)}`).join(", ")}.`;
  }
  return "Ask me who owes the most, how much we spent this month, who paid the most, or to generate a money report.";
}

const difficultyBadge: Record<TaskDifficulty, "success" | "warning" | "danger"> = {
  easy: "success",
  medium: "warning",
  heavy: "danger",
};

function userName(state: HouseState, id: string | null | undefined) {
  return state.users.find((user) => user.id === id)?.name ?? "Unassigned";
}

function userById(state: HouseState, id: string | null | undefined) {
  return state.users.find((user) => user.id === id) ?? null;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

const identityStorageKey = "housefair:device-identity";
const sessionStorageKey = "housefair:device-session";
const queueStorageKey = "housefair:offline-actions";
const identityEvent = "housefair-identity";
const legacyPersonIds: Record<string, string> = {
  "user-uzair": "Uzair",
  "user-sheraz": "Sheraz",
  "user-shahram": "Shahram",
  "user-hammad": "Hammad",
  "user-usama": "Usama",
  "user-ali": "Ali",
};

function readJson<T>(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function getStoredIdentity() {
  if (typeof window === "undefined") return null;
  return readJson<DeviceIdentity>(window.localStorage.getItem(identityStorageKey));
}

function getStoredSession() {
  if (typeof window === "undefined") return null;
  const localSession = readJson<DeviceSession>(
    window.localStorage.getItem(sessionStorageKey),
  );
  const sessionSession = readJson<DeviceSession>(
    window.sessionStorage.getItem(sessionStorageKey),
  );
  const session = localSession ?? sessionSession;

  if (!session) return null;
  if (session.expiresAt && new Date(session.expiresAt).getTime() <= Date.now()) {
    window.localStorage.removeItem(sessionStorageKey);
    window.sessionStorage.removeItem(sessionStorageKey);
    return null;
  }

  return session;
}

function storeDeviceSession(session: {
  deviceId: string;
  personId: string;
  sessionToken: string;
  expiresAt: string;
}) {
  const identity: DeviceIdentity = {
    deviceId: session.deviceId,
    personId: session.personId,
    expiresAt: session.expiresAt,
  };
  const deviceSession: DeviceSession = {
    ...identity,
    sessionToken: session.sessionToken,
    verifiedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(identityStorageKey, JSON.stringify(identity));
  window.localStorage.setItem(sessionStorageKey, JSON.stringify(deviceSession));
  window.sessionStorage.setItem(sessionStorageKey, JSON.stringify(deviceSession));
  window.dispatchEvent(new Event(identityEvent));
}

function clearStoredSession() {
  window.localStorage.removeItem(sessionStorageKey);
  window.sessionStorage.removeItem(sessionStorageKey);
}

function clearDeviceSession() {
  window.localStorage.removeItem(identityStorageKey);
  clearStoredSession();
  window.dispatchEvent(new Event(identityEvent));
}

function subscribeToIdentity(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener("storage", callback);
  window.addEventListener(identityEvent, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(identityEvent, callback);
  };
}

function getIdentitySnapshot() {
  if (typeof window === "undefined") return null;
  return JSON.stringify({
    identity: getStoredIdentity(),
    session: getStoredSession(),
  });
}

function getServerIdentitySnapshot() {
  return null;
}

function normalizePersonId(users: HouseUser[], personId: string | null | undefined) {
  if (!personId) return personId ?? null;
  if (users.some((user) => user.id === personId)) return personId;

  const legacyName = legacyPersonIds[personId] ?? personId;
  return users.find((user) => user.name.toLowerCase() === legacyName.toLowerCase())?.id ?? personId;
}

async function uploadImage({
  file,
  taskId,
  kind,
  session,
}: {
  file: File;
  taskId: string;
  kind: string;
  session: DeviceSession;
}) {
  const formData = new FormData();
  formData.set("file", file);
  formData.set("taskId", taskId);
  formData.set("kind", kind);

  const response = await fetch("/api/proof/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.sessionToken}`,
      "x-housefair-device-id": session.deviceId,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Image upload failed.");
  }

  const result = (await response.json()) as { url: string | null };
  if (!result.url) throw new Error("Image upload did not return a usable URL.");
  return result.url;
}

function readQueue() {
  if (typeof window === "undefined") return [];
  return readJson<QueuedAction[]>(window.localStorage.getItem(queueStorageKey)) ?? [];
}

function writeQueue(actions: QueuedAction[]) {
  window.localStorage.setItem(queueStorageKey, JSON.stringify(actions));
}

function queueOfflineAction(action: Omit<QueuedAction, "id" | "createdAt">) {
  const next = [
    ...readQueue(),
    {
      ...action,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    },
  ];
  writeQueue(next);
  window.dispatchEvent(new Event("housefair-queue"));
  if ("serviceWorker" in navigator) {
    void navigator.serviceWorker.ready.then((registration) => {
      const syncRegistration = registration as ServiceWorkerRegistration & {
        sync?: { register: (tag: string) => Promise<void> };
      };
      return syncRegistration.sync?.register("housefair-offline-sync");
    });
  }
}

function StatTile({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  tone?: "default" | "green" | "amber" | "rose";
}) {
  return (
    <GlassCard className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-2xl font-black tabular-nums">{value}</p>
        </div>
        <div
          className={cn(
            "grid size-10 place-items-center rounded-2xl",
            tone === "green" && "bg-emerald-500/14 text-emerald-700 dark:text-emerald-300",
            tone === "amber" && "bg-amber-500/18 text-amber-800 dark:text-amber-300",
            tone === "rose" && "bg-rose-500/14 text-rose-700 dark:text-rose-300",
            tone === "default" && "bg-primary/12 text-primary",
          )}
        >
          <Icon className="size-5" />
        </div>
      </div>
    </GlassCard>
  );
}

function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-lg font-black tracking-normal">{title}</h2>
      {action}
    </div>
  );
}

function PersonPill({ user }: { user: HouseUser }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Avatar className="size-8">
        <AvatarFallback name={user.name} gradient={user.avatar_gradient} />
      </Avatar>
      <span className="truncate text-sm font-bold">{user.name}</span>
    </div>
  );
}

function TaskCard({
  state,
  currentUser,
  task,
  onComplete,
  onDefer,
  onWhatsApp,
  onSwap,
  onCancelSwap,
}: {
  state: HouseState;
  currentUser: HouseUser;
  task: Task;
  onComplete: (task: Task) => void;
  onDefer: (task: Task) => void;
  onWhatsApp: (task: Task) => void;
  onSwap: (task: Task) => void;
  onCancelSwap: (swap: HouseState["task_swaps"][number]) => void;
}) {
  const assignee = userById(state, task.assigned_person);
  const swap = state.task_swaps.find(
    (item) => item.task_id === task.id && item.status === "requested",
  );
  const isOwnSwap = swap?.requested_by === currentUser.id;
  const checklist = taskChecklist(task);
  const carriedOver = isTaskCarriedOver(task);
  const canDefer =
    task.status !== "completed" &&
    (!task.assigned_person || task.assigned_person === currentUser.id);

  return (
    <motion.div
      layout
      drag={task.status === "completed" ? false : "x"}
      dragConstraints={{ left: 0, right: 110 }}
      dragElastic={0.18}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      onDragEnd={(_, info) => {
        if (info.offset.x > 82 && task.status !== "completed") {
          navigator.vibrate?.(14);
          onComplete(task);
        }
      }}
    >
      <GlassCard className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant={difficultyBadge[task.difficulty]}>{task.difficulty}</Badge>
              <Badge variant={task.proof_required ? "info" : "outline"}>
                {task.proof_required ? "Proof" : `${task.points} pts`}
              </Badge>
              <Badge variant="outline">
                <Clock className="size-3" />
                {taskMinutes(task)}m
              </Badge>
              <Badge variant={task.status === "completed" ? "success" : "secondary"}>
                {task.status.replace("_", " ")}
              </Badge>
              {carriedOver ? <Badge variant="warning">carry-over</Badge> : null}
            </div>
            <h3 className="text-base font-black">{task.title}</h3>
            <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">
              {task.description}
            </p>
            <div className="mt-2 grid gap-1 text-xs font-semibold text-muted-foreground">
              <span>Area: {task.location}</span>
              <span>{difficultyExplanation(task)}</span>
              <span>{pointsExplanation(task)}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-black tabular-nums">+{task.points}</p>
            <p className="text-xs font-semibold text-muted-foreground">points</p>
          </div>
        </div>
        <div className="mt-3 grid gap-2 rounded-2xl bg-background/55 p-3">
          {checklist.slice(0, 4).map((item) => (
            <div key={item} className="flex items-start gap-2 text-xs font-semibold leading-4">
              <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-300" />
              <span>{item}</span>
            </div>
          ))}
          {checklist.length > 4 ? (
            <p className="text-xs font-bold text-muted-foreground">
              +{checklist.length - 4} more checklist items
            </p>
          ) : null}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            {assignee ? <PersonPill user={assignee} /> : <p className="text-sm">Unassigned</p>}
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              {task.location} · {relativeDay(task.due_date)}
            </p>
            {carriedOver ? (
              <p className="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                Pending {task.deferral_count ? `${task.deferral_count}x` : "from earlier"}
                {task.defer_reason ? ` - ${task.defer_reason}` : ""}
              </p>
            ) : null}
          </div>
          <Button
            size="sm"
            variant={task.status === "completed" ? "secondary" : "premium"}
            disabled={task.status === "completed"}
            onClick={() => onComplete(task)}
          >
            <Check className="size-4" />
            {task.status === "completed" ? "Done" : "Complete"}
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-background/55 p-2">
          <p className="text-xs font-semibold text-muted-foreground">
            {swap ? `Swap requested by ${userName(state, swap.requested_by)}` : "Need help?"}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            {canDefer ? (
              <Button size="sm" variant="outline" onClick={() => onDefer(task)}>
                <Clock className="size-4" />
                Not today
              </Button>
            ) : null}
            {assignee ? (
              <Button size="sm" variant="outline" onClick={() => onWhatsApp(task)}>
                <MessageCircle className="size-4" />
                WhatsApp
              </Button>
            ) : null}
            {isOwnSwap && swap ? (
              <Button size="sm" variant="outline" onClick={() => onCancelSwap(swap)}>
                Cancel swap
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => onSwap(task)}>
                {swap ? "Accept swap" : "Request swap"}
              </Button>
            )}
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

function TodayScreen({
  state,
  currentUser,
  onOpenDialog,
  onNavigate,
  onAddExpense,
  onDefer,
  onWhatsApp,
}: {
  state: HouseState;
  currentUser: HouseUser;
  onOpenDialog: (dialog: DialogName) => void;
  onNavigate: (view: View) => void;
  onAddExpense: () => void;
  onDefer: (task: Task) => void;
  onWhatsApp: (task: Task) => void;
}) {
  const todayKey = dateKey(new Date());
  const money = React.useMemo(() => calculateMoneySummary(state), [state]);
  const myBalance = money.balances.get(currentUser.id) ?? 0;
  const todayTasks = state.tasks.filter(
    (task) => task.assigned_person === currentUser.id && isOpenDueTask(task, todayKey),
  );
  const groceryAlerts = state.groceries.filter((item) =>
    ["running_low", "needed"].includes(item.status),
  );
  const openIssues = state.complaints.filter((item) => item.status !== "resolved");
  const myRulesAccepted = state.house_rule_acceptances.some(
    (item) => item.user_id === currentUser.id,
  );
  const reminders = smartReminders(state, currentUser);
  const recent = activityFeed(state, 6);
  const mostUrgentGrocery = groceryAlerts[0];
  const openTaskCount = state.tasks.filter((task) => task.status !== "completed").length;

  return (
    <ScreenFrame>
      <HeaderBlock
        icon={Sparkles}
        eyebrow={`Today · ${houseModeLabels[state.house_mode]}`}
        title={`Today, ${currentUser.name}`}
        body={`${houseModeNotes[state.house_mode]} ${todayTasks.length} task${todayTasks.length === 1 ? "" : "s"} need your attention.`}
        action={
          <Button className="w-full sm:w-auto" variant="premium" onClick={() => onOpenDialog("complete")}>
            <Check className="size-4" />
            Complete
          </Button>
        }
      />

      <GlassCard className="overflow-hidden p-4">
        <div className="flex items-center gap-4">
          <ProgressRing value={state.stats.house_cleanliness} label="health" size={96} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Current house health
            </p>
            <h2 className="mt-1 text-2xl font-black">{state.stats.house_cleanliness}% ready</h2>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              {openTaskCount} open routines, {openIssues.length} open issue{openIssues.length === 1 ? "" : "s"}, and{" "}
              {groceryAlerts.length} grocery alert{groceryAlerts.length === 1 ? "" : "s"}.
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            ["Kitchen", state.stats.kitchen_status],
            ["Bathroom", state.stats.bathroom_status],
            ["Trash", state.stats.trash_status],
          ].map(([label, value]) => (
            <div key={label as string} className="rounded-2xl bg-background/65 p-3">
              <p className="truncate text-xs font-bold text-muted-foreground">{label as string}</p>
              <p className="mt-1 text-lg font-black">{value}%</p>
              <Progress value={Number(value)} className="mt-2" />
            </div>
          ))}
        </div>
      </GlassCard>

      <div className="grid grid-cols-2 gap-3">
        <GlassCard className="p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-muted-foreground">Money status</p>
            <CreditCard className="size-4 text-primary" />
          </div>
          <p className={cn("text-2xl font-black", myBalance >= 0 ? "text-emerald-600" : "text-rose-600")}>
            {formatCurrency(myBalance)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {myBalance >= 0 ? "You are owed" : "You owe"} - house score {money.score}%
          </p>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-muted-foreground">Grocery status</p>
            <ShoppingBasket className="size-4 text-primary" />
          </div>
          <p className="text-2xl font-black">{groceryAlerts.length}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {mostUrgentGrocery ? `${mostUrgentGrocery.name} needs attention` : "Stock looks calm"}
          </p>
        </GlassCard>
      </div>

      <GlassCard className="p-4">
        <SectionHeader
          title="Today's routines"
          action={
            <Button size="sm" variant="ghost" onClick={() => onNavigate("tasks")}>
              Calendar <ChevronRight className="size-4" />
            </Button>
          }
        />
        <div className="grid gap-3">
          {todayTasks.slice(0, 4).map((task) => (
            <div key={task.id} className="rounded-2xl bg-background/65 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-black">{task.title}</p>
                  <p className="text-xs font-bold text-muted-foreground">
                    {task.location} · {taskMinutes(task)}m · {userName(state, task.assigned_person)}
                  </p>
                </div>
                <Badge variant={difficultyBadge[task.difficulty]}>+{task.points}</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{pointsExplanation(task)}</p>
              {isTaskCarriedOver(task, todayKey) ? (
                <p className="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  Carried over{task.deferral_count ? ` ${task.deferral_count}x` : ""}
                  {task.defer_reason ? ` - ${task.defer_reason}` : ""}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => onDefer(task)}>
                  <Clock className="size-4" />
                  Not today
                </Button>
                <Button size="sm" variant="outline" onClick={() => onWhatsApp(task)}>
                  <MessageCircle className="size-4" />
                  WhatsApp
                </Button>
              </div>
            </div>
          ))}
          {todayTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing pending for you right now. Weekly cleaning can wait until the assigned person has time.
            </p>
          ) : null}
        </div>
      </GlassCard>

      <div className="grid grid-cols-3 gap-3">
        <StatTile icon={ListChecks} label="Pending" value={state.stats.pending_tasks} tone="amber" />
        <StatTile icon={AlertTriangle} label="Issues" value={openIssues.length} tone="rose" />
        <StatTile icon={ShieldCheck} label="Rules" value={myRulesAccepted ? "Yes" : "No"} tone="green" />
      </div>

      <GlassCard className="p-4">
        <SectionHeader title="Smart reminders" />
        <div className="grid gap-2">
          {reminders.map((reminder) => {
            const Icon = reminder.icon;
            return (
              <div key={reminder.id} className="flex items-start gap-3 rounded-2xl bg-background/65 p-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-2xl bg-primary/12 text-primary">
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-black">{reminder.title}</p>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">{reminder.body}</p>
                </div>
              </div>
            );
          })}
          {reminders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No urgent nudges right now. The house is calm.</p>
          ) : null}
        </div>
      </GlassCard>

      <GlassCard className="p-4">
        <SectionHeader title="Quick actions" />
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => onOpenDialog("complete")}>
            <Check className="size-4" />
            Complete task
          </Button>
          <Button variant="outline" onClick={onAddExpense}>
            <Euro className="size-4" />
            Add expense
          </Button>
          <Button variant="outline" onClick={() => onOpenDialog("grocery")}>
            <ShoppingBasket className="size-4" />
            Add grocery
          </Button>
          <Button variant="outline" onClick={() => onOpenDialog("complaint")}>
            <AlertTriangle className="size-4" />
            Report issue
          </Button>
        </div>
      </GlassCard>

      <GlassCard className="p-4">
        <SectionHeader title="Recent house activity" />
        <div className="grid gap-2">
          {recent.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.id} className="flex items-start gap-3 rounded-2xl bg-background/65 p-3">
                <div
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-2xl",
                    item.tone === "task" && "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
                    item.tone === "money" && "bg-sky-500/12 text-sky-700 dark:text-sky-300",
                    item.tone === "grocery" && "bg-amber-500/16 text-amber-800 dark:text-amber-300",
                    item.tone === "issue" && "bg-rose-500/12 text-rose-700 dark:text-rose-300",
                    item.tone === "system" && "bg-primary/12 text-primary",
                  )}
                >
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="break-words text-sm font-black">{item.title}</p>
                    <span className="shrink-0 text-[0.68rem] font-bold text-muted-foreground">
                      {relativeDay(item.at)}
                    </span>
                  </div>
                  <p className="mt-1 break-words text-xs leading-4 text-muted-foreground">{item.body}</p>
                </div>
              </div>
            );
          })}
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Activity will appear after the first real task, grocery, issue, or expense.
            </p>
          ) : null}
        </div>
      </GlassCard>
    </ScreenFrame>
  );
}

function TasksScreen({
  state,
  currentUser,
  onComplete,
  onDefer,
  onWhatsApp,
  onSwap,
  onCancelSwap,
}: {
  state: HouseState;
  currentUser: HouseUser;
  onComplete: (task: Task) => void;
  onDefer: (task: Task) => void;
  onWhatsApp: (task: Task) => void;
  onSwap: (task: Task) => void;
  onCancelSwap: (swap: HouseState["task_swaps"][number]) => void;
}) {
  return (
    <ScreenFrame>
      <HeaderBlock
        icon={ListChecks}
        eyebrow="Task system"
        title="Fair work, visible credit"
        body={`${state.stats.pending_tasks} active tasks across daily, weekly, and monthly house care.`}
      />

      <Tabs defaultValue="mine" className="w-full">
        <TabsList className="no-scrollbar flex w-full justify-start overflow-x-auto">
          <TabsTrigger value="mine">Mine</TabsTrigger>
          <TabsTrigger value="calendar">Week</TabsTrigger>
          <TabsTrigger value="month">Month</TabsTrigger>
          <TabsTrigger value="weekly">Routines</TabsTrigger>
          <TabsTrigger value="quick">+1</TabsTrigger>
        </TabsList>
        <TabsContent value="calendar" className="grid gap-3">
          {Array.from({ length: 7 }).map((_, index) => {
            const date = new Date();
            date.setDate(date.getDate() + index);
            const key = dateKey(date);
            const dayTasks = state.tasks.filter((task) => taskDueKey(task.due_date) === key);

            return (
              <GlassCard key={key} className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="size-4 text-primary" />
                    <p className="font-black">{index === 0 ? "Today" : dayLabel(key)}</p>
                  </div>
                  <Badge variant="outline">{dayTasks.length}</Badge>
                </div>
                <div className="grid gap-2">
                  {dayTasks.map((task) => (
                    <div
                      key={task.id}
                      className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl bg-background/65 p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black">{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {userName(state, task.assigned_person)} - {task.location}
                        </p>
                      </div>
                      <Badge variant={difficultyBadge[task.difficulty]}>+{task.points}</Badge>
                    </div>
                  ))}
                  {dayTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No tasks due.</p>
                  ) : null}
                </div>
              </GlassCard>
            );
          })}
        </TabsContent>
        <TabsContent value="month" className="grid gap-3">
          {Array.from({ length: 30 }).map((_, index) => {
            const date = new Date();
            date.setDate(date.getDate() + index);
            const key = dateKey(date);
            const dayTasks = state.tasks.filter((task) => taskDueKey(task.due_date) === key);
            if (!dayTasks.length) return null;

            return (
              <GlassCard key={key} className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-black">{index === 0 ? "Today" : dayLabel(key)}</p>
                  <Badge variant="outline">{dayTasks.length}</Badge>
                </div>
                <div className="grid gap-2">
                  {dayTasks.map((task) => (
                    <div key={task.id} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl bg-background/65 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black">{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {userName(state, task.assigned_person)} · {task.location}
                        </p>
                      </div>
                      <Badge variant={difficultyBadge[task.difficulty]}>{task.difficulty}</Badge>
                    </div>
                  ))}
                </div>
              </GlassCard>
            );
          })}
        </TabsContent>
        <TabsContent value="quick" className="grid gap-3">
          {state.tasks
            .filter((task) => task.points === 1)
            .map((task) => (
              <TaskCard
                key={task.id}
                state={state}
                currentUser={currentUser}
                task={task}
                onComplete={onComplete}
                onDefer={onDefer}
                onWhatsApp={onWhatsApp}
                onSwap={onSwap}
                onCancelSwap={onCancelSwap}
              />
            ))}
          {state.tasks.filter((task) => task.points === 1).length === 0 ? (
            <GlassCard className="p-4 text-sm font-semibold text-muted-foreground">
              No quick +1 tasks right now.
            </GlassCard>
          ) : null}
        </TabsContent>
        <TabsContent value="mine" className="grid gap-3">
          {state.tasks
            .filter((task) => task.assigned_person === currentUser.id)
            .map((task) => (
              <TaskCard
                key={task.id}
                state={state}
                currentUser={currentUser}
                task={task}
                onComplete={onComplete}
                onDefer={onDefer}
                onWhatsApp={onWhatsApp}
                onSwap={onSwap}
                onCancelSwap={onCancelSwap}
              />
            ))}
        </TabsContent>
        <TabsContent value="daily" className="grid gap-3">
          {state.tasks
            .filter((task) => task.frequency === "daily")
            .map((task) => (
              <TaskCard
                key={task.id}
                state={state}
                currentUser={currentUser}
                task={task}
                onComplete={onComplete}
                onDefer={onDefer}
                onWhatsApp={onWhatsApp}
                onSwap={onSwap}
                onCancelSwap={onCancelSwap}
              />
            ))}
        </TabsContent>
        <TabsContent value="weekly" className="grid gap-3">
          {state.tasks
            .filter((task) => task.frequency === "weekly")
            .map((task) => (
              <TaskCard
                key={task.id}
                state={state}
                currentUser={currentUser}
                task={task}
                onComplete={onComplete}
                onDefer={onDefer}
                onWhatsApp={onWhatsApp}
                onSwap={onSwap}
                onCancelSwap={onCancelSwap}
              />
            ))}
        </TabsContent>
        <TabsContent value="heavy" className="grid gap-3">
          {state.tasks
            .filter((task) => task.difficulty === "heavy")
            .map((task) => (
              <TaskCard
                key={task.id}
                state={state}
                currentUser={currentUser}
                task={task}
                onComplete={onComplete}
                onDefer={onDefer}
                onWhatsApp={onWhatsApp}
                onSwap={onSwap}
                onCancelSwap={onCancelSwap}
              />
            ))}
        </TabsContent>
      </Tabs>

      <GlassCard className="p-4">
        <SectionHeader title="Point rules" />
        <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
          <div className="rounded-2xl bg-emerald-500/12 p-3 text-emerald-700 dark:text-emerald-300">
            Easy
            <span className="mt-1 block text-lg">3-4</span>
          </div>
          <div className="rounded-2xl bg-amber-500/16 p-3 text-amber-800 dark:text-amber-300">
            Medium
            <span className="mt-1 block text-lg">4-6</span>
          </div>
          <div className="rounded-2xl bg-rose-500/12 p-3 text-rose-700 dark:text-rose-300">
            Heavy
            <span className="mt-1 block text-lg">6-8</span>
          </div>
        </div>
      </GlassCard>
    </ScreenFrame>
  );
}

function AIManagerScreen({
  state,
  apiFetch,
}: {
  state: HouseState;
  apiFetch: (endpoint: string, init: RequestInit) => Promise<Response>;
}) {
  const [plan, setPlan] = React.useState<WeeklyPlan | null>(null);
  const [source, setSource] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [chatInput, setChatInput] = React.useState("");
  const [chatMessages, setChatMessages] = React.useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([
    {
      role: "assistant",
      content:
        "Ask me who should clean the bathroom, what groceries are missing, who has done least work, or to generate a weekly plan.",
    },
  ]);
  const [chatLoading, setChatLoading] = React.useState(false);

  async function generatePlan() {
    setLoading(true);
    try {
      const response = await apiFetch("/api/ai/weekly-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error("Could not generate plan.");
      const result = (await response.json()) as { plan: WeeklyPlan; source: string };
      setPlan(result.plan);
      setSource(result.source);
      toast.success("Weekly plan generated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI plan failed");
    } finally {
      setLoading(false);
    }
  }

  async function askAI(message: string) {
    const prompt = message.trim();
    if (!prompt) return;

    setChatInput("");
    setChatMessages((current) => [...current, { role: "user", content: prompt }]);
    setChatLoading(true);
    try {
      const response = await apiFetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt }),
      });
      if (!response.ok) throw new Error("AI chat failed.");
      const result = (await response.json()) as { answer: string; plan: WeeklyPlan | null };
      setChatMessages((current) => [
        ...current,
        { role: "assistant", content: result.answer },
      ]);
      if (result.plan) {
        setPlan(result.plan);
        setSource("chat");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI chat failed");
    } finally {
      setChatLoading(false);
    }
  }

  const storedRecommendation = state.ai_recommendations.find(
    (item) => item.type === "weekly_plan",
  )?.recommendation;
  const storedPlan =
    storedRecommendation &&
    Array.isArray((storedRecommendation as Partial<WeeklyPlan>).assignments)
      ? (storedRecommendation as WeeklyPlan)
      : null;
  const activePlan = plan ?? storedPlan;
  const scores = activePlan?.cleanliness_scores ?? state.cleanliness_scores;

  return (
    <ScreenFrame>
      <HeaderBlock
        icon={Brain}
        eyebrow="HouseFair AI Manager"
        title="Draft the next fair week"
        body="The manager weighs workload, points, complaints, difficulty, availability, and bathroom rules."
        action={
          <Button
            className="h-auto min-h-11 w-full min-w-0 whitespace-normal py-3 leading-tight sm:w-auto"
            variant="premium"
            onClick={generatePlan}
            disabled={loading}
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
            Generate Weekly Plan
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3">
        {scores.length > 0 ? (
          scores.map((score) => (
            <GlassCard key={score.label} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-muted-foreground">{score.label}</p>
                  <p className="mt-1 text-3xl font-black tabular-nums">{score.score}%</p>
                </div>
                <Badge
                  variant={
                    score.trend === "up" ? "success" : score.trend === "down" ? "danger" : "warning"
                  }
                >
                  {score.trend}
                </Badge>
              </div>
              <Progress value={score.score} className="mt-3" />
            </GlassCard>
          ))
        ) : (
          <GlassCard className="col-span-2 p-4">
            <p className="text-sm font-black">No AI cleanliness score yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Generate a weekly plan to create scores from the current house state.
            </p>
          </GlassCard>
        )}
      </div>

      <GlassCard className="p-4">
        <SectionHeader title="Ask HouseFair AI" />
        <div className="grid gap-2">
          {chatMessages.slice(-5).map((message, index) => (
            <div
              key={`${message.role}-${index}-${message.content.slice(0, 12)}`}
              className={cn(
                "min-w-0 break-words rounded-2xl p-3 text-sm leading-5",
                message.role === "assistant"
                  ? "bg-background/65"
                  : "bg-primary text-primary-foreground",
              )}
            >
              {message.content}
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[
            "Who should clean bathroom?",
            "What groceries are missing?",
            "Who has done least work?",
            "Generate weekly plan.",
          ].map((prompt) => (
            <Button
              key={prompt}
              type="button"
              size="sm"
              variant="outline"
              className="h-auto min-h-9 w-full whitespace-normal px-2 py-2 text-center leading-tight"
              onClick={() => askAI(prompt)}
            >
              {prompt}
            </Button>
          ))}
        </div>
        <form
          className="mt-3 grid grid-cols-[1fr_auto] gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void askAI(chatInput);
          }}
        >
          <Input
            value={chatInput}
            onChange={(event) => setChatInput(event.target.value)}
            placeholder="Ask about chores, groceries, guests..."
            aria-label="Ask HouseFair AI"
          />
          <Button type="submit" variant="premium" disabled={chatLoading}>
            {chatLoading ? <Loader2 className="size-4 animate-spin" /> : <MessageCircle className="size-4" />}
          </Button>
        </form>
      </GlassCard>

      <GlassCard className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Generated plan</p>
            <h2 className="text-xl font-black">{activePlan?.title ?? "No draft yet"}</h2>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant="info">{source ?? "Draft"}</Badge>
            <Badge variant="outline">review first</Badge>
          </div>
        </div>
        <p className="mt-2 text-sm leading-5 text-muted-foreground">
          {activePlan?.summary ?? "Generate a weekly plan to preview assignments before anyone is moved."}
        </p>
      </GlassCard>

      {activePlan?.fairness_report ? (
        <GlassCard className="p-4">
          <SectionHeader title="Fairness report" />
          <p className="text-sm leading-5 text-muted-foreground">
            {activePlan.fairness_report}
          </p>
          <div className="mt-3 grid gap-2">
            {activePlan.fairness_notes.slice(0, 4).map((note) => (
              <div key={note} className="rounded-2xl bg-background/65 p-3 text-sm font-semibold">
                {note}
              </div>
            ))}
          </div>
        </GlassCard>
      ) : null}

      {activePlan ? (
        <div className="grid gap-3">
          {activePlan.assignments.map((assignment, index) => {
            const user = userById(state, assignment.assigned_to);
            return (
              <GlassCard key={`${assignment.task_title}-${index}`} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <Badge variant={difficultyBadge[assignment.difficulty]}>
                        {assignment.difficulty}
                      </Badge>
                      <Badge variant="outline">{assignment.due_day}</Badge>
                    </div>
                    <h3 className="font-black">{assignment.task_title}</h3>
                    <p className="mt-1 break-words text-sm text-muted-foreground">{assignment.reason}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black">+{assignment.points}</p>
                    <p className="text-xs font-bold text-muted-foreground">pts</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  {user ? <PersonPill user={user} /> : <span />}
                  <span className="max-w-[45%] break-words text-right text-xs font-bold text-muted-foreground">
                    {assignment.location}
                  </span>
                </div>
              </GlassCard>
            );
          })}
        </div>
      ) : null}

      <GlassCard className="p-4">
        <SectionHeader title="Grocery predictions" />
        <div className="grid gap-2">
          {(activePlan?.grocery_predictions ?? []).slice(0, 4).map((prediction) => (
            <div
              key={prediction.item}
              className="flex items-center justify-between rounded-2xl bg-background/65 p-3"
            >
              <div>
                <p className="font-black">{prediction.item}</p>
                <p className="text-xs text-muted-foreground">{prediction.reason}</p>
              </div>
              <Badge variant="warning">{prediction.confidence}%</Badge>
            </div>
          ))}
          {!activePlan?.grocery_predictions?.length ? (
            <p className="text-sm text-muted-foreground">Predictions appear after a plan is generated.</p>
          ) : null}
        </div>
      </GlassCard>

      {activePlan?.cleaning_recommendations?.length ? (
        <GlassCard className="p-4">
          <SectionHeader title="Cleaning recommendations" />
          <div className="grid gap-2">
            {activePlan.cleaning_recommendations.map((recommendation) => (
              <div
                key={recommendation}
                className="flex items-start gap-3 rounded-2xl bg-background/65 p-3"
              >
                <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="text-sm font-semibold leading-5">{recommendation}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      ) : null}
    </ScreenFrame>
  );
}

function GroceriesScreen({
  state,
  currentUser,
  onOpenAdd,
  onOpenScan,
  onUpdate,
  onToggleShopping,
}: {
  state: HouseState;
  currentUser: HouseUser;
  onOpenAdd: () => void;
  onOpenScan: () => void;
  onUpdate: (item: GroceryItem, status: GroceryStatus, price?: number | null) => void;
  onToggleShopping: (active: boolean) => void;
}) {
  const categories = Array.from(new Set(state.groceries.map((item) => item.category)));
  const [category, setCategory] = React.useState("All");
  const [prices, setPrices] = React.useState<Record<string, string>>({});
  const activeShopping = state.shopping_sessions.find(
    (session) => session.user_id === currentUser.id && session.is_active,
  );
  const activeShoppers = state.shopping_sessions
    .filter((session) => session.is_active)
    .map((session) => userName(state, session.user_id));

  const visible = state.groceries.filter((item) =>
    category === "All" ? true : item.category === category,
  );
  const shoppingList = state.groceries.filter((item) =>
    ["running_low", "needed"].includes(item.status),
  );
  const boughtWithPrices = state.groceries.filter(
    (item) => item.status === "bought" && item.price && item.bought_by,
  );
  const totalSpend = boughtWithPrices.reduce((total, item) => total + (item.price ?? 0), 0);
  const share = state.users.length ? totalSpend / state.users.length : 0;
  const predictions = groceryConsumptionPredictions(state);

  return (
    <ScreenFrame>
      <HeaderBlock
        icon={ShoppingBasket}
        eyebrow="Grocery manager"
        title="Shared stock, fewer surprises"
        body={`${state.stats.grocery_alerts} items need attention. Added as ${currentUser.name}.`}
        action={
          <div className="flex gap-2">
            <Button variant={activeShopping ? "outline" : "premium"} onClick={() => onToggleShopping(!activeShopping)}>
              <ShoppingBasket className="size-4" />
              {activeShopping ? "Done" : "Shopping"}
            </Button>
            <Button variant="glass" onClick={onOpenScan} aria-label="Scan barcode">
              <Archive className="size-4" />
            </Button>
            <Button variant="glass" onClick={onOpenAdd} aria-label="Add grocery">
              <Plus className="size-4" />
            </Button>
          </div>
        }
      />

      <GlassCard className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-black">Shopping mode</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {activeShoppers.length
                ? `${activeShoppers.join(", ")} ${activeShoppers.length === 1 ? "is" : "are"} shopping now.`
                : "Nobody is shopping right now."}
            </p>
          </div>
          <Badge variant={activeShopping ? "success" : "outline"}>
            {activeShopping ? "Active" : "Idle"}
          </Badge>
        </div>
        {activeShopping ? (
          <div className="mt-3 grid gap-2">
            {shoppingList.slice(0, 6).map((item) => (
              <div key={item.id} className="grid grid-cols-[1fr_5rem_auto] items-center gap-2 rounded-2xl bg-background/65 p-2">
                <span className="truncate text-sm font-bold">{item.name}</span>
                <Input
                  value={prices[item.id] ?? ""}
                  onChange={(event) =>
                    setPrices((current) => ({ ...current, [item.id]: event.target.value }))
                  }
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="EUR"
                  aria-label={`${item.name} price`}
                />
                <Button
                  size="sm"
                  variant="premium"
                  onClick={() => onUpdate(item, "bought", prices[item.id] ? Number(prices[item.id]) : null)}
                >
                  <Check className="size-4" />
                </Button>
              </div>
            ))}
            {shoppingList.length === 0 ? (
              <p className="text-sm text-muted-foreground">No needed items in the checklist.</p>
            ) : null}
          </div>
        ) : null}
      </GlassCard>

      <GlassCard className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Receipt className="size-4 text-primary" />
          <p className="font-black">Shared balance</p>
        </div>
        <div className="grid gap-2">
          {state.users.map((user) => {
            const paid = boughtWithPrices
              .filter((item) => item.bought_by === user.id)
              .reduce((total, item) => total + (item.price ?? 0), 0);
            const balance = paid - share;
            return (
              <div key={user.id} className="flex items-center justify-between rounded-2xl bg-background/65 p-2 text-sm">
                <span className="font-bold">{user.name}</span>
                <span className={cn("font-black", balance >= 0 ? "text-emerald-600" : "text-muted-foreground")}>
                  {formatCurrency(balance)}
                </span>
              </div>
            );
          })}
        </div>
      </GlassCard>

      <GlassCard className="p-4">
        <SectionHeader title="AI consumption prediction" />
        <div className="grid gap-2">
          {predictions.slice(0, 5).map((prediction) => (
            <div key={prediction.item.id} className="rounded-2xl bg-background/65 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-black">{prediction.item.name}</p>
                <Badge variant={prediction.confidence > 85 ? "warning" : "outline"}>
                  {prediction.confidence}%
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{prediction.message}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {["All", ...categories].map((item) => (
          <Button
            key={item}
            size="sm"
            variant={category === item ? "default" : "glass"}
            onClick={() => setCategory(item)}
          >
            {item}
          </Button>
        ))}
      </div>

      <div className="grid gap-3">
        {visible.map((item) => (
          <GlassCard key={item.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-black">{item.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {item.category}
                  {item.price ? ` · ${formatCurrency(item.price)}` : ""}
                </p>
              </div>
              <Badge
                variant={
                  item.status === "available"
                    ? "success"
                    : item.status === "needed"
                      ? "danger"
                      : item.status === "bought"
                        ? "info"
                        : "warning"
                }
              >
                {statusLabels[item.status]}
              </Badge>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {(["running_low", "needed", "bought"] as GroceryStatus[]).map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={item.status === status ? "default" : "outline"}
                  onClick={() => onUpdate(item, status)}
                >
                  {statusLabels[status]}
                </Button>
              ))}
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="p-4">
        <button
          type="button"
          className="flex w-full items-center gap-3 text-left"
          onClick={onOpenScan}
        >
          <div className="grid size-11 place-items-center rounded-2xl bg-primary/12 text-primary">
            <Archive className="size-5" />
          </div>
          <div>
            <p className="font-black">Scan barcode</p>
            <p className="text-sm text-muted-foreground">
              Use the camera to suggest item name, category, and shopping rhythm.
            </p>
          </div>
        </button>
      </GlassCard>
    </ScreenFrame>
  );
}

function MoneyScreen({
  state,
  currentUser,
  onOpenExpense,
  onOpenSettlement,
  onOpenBudget,
  onEditExpense,
  onDeleteExpense,
  onAddComment,
}: {
  state: HouseState;
  currentUser: HouseUser;
  onOpenExpense: () => void;
  onOpenSettlement: () => void;
  onOpenBudget: () => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (expense: Expense) => void;
  onAddComment: (expense: Expense) => void;
}) {
  const summary = React.useMemo(() => calculateMoneySummary(state), [state]);
  const [moneyPrompt, setMoneyPrompt] = React.useState("");
  const [moneyMessages, setMoneyMessages] = React.useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([
    {
      role: "assistant",
      content:
        "Ask me who owes the most, how much we spent this month, who paid the most, or to generate a money report.",
    },
  ]);
  const myBalance = summary.balances.get(currentUser.id) ?? 0;
  const maxCategory = Math.max(...summary.categoryTotals.map((item) => item.total), 1);
  const activeExpenses = state.expenses.filter((expense) => !expense.deleted_at);

  function askMoneyAI(prompt: string) {
    const question = prompt.trim();
    if (!question) return;
    setMoneyPrompt("");
    setMoneyMessages((current) => [
      ...current,
      { role: "user", content: question },
      { role: "assistant", content: moneyAnswer(state, question) },
    ]);
  }

  return (
    <ScreenFrame>
      <HeaderBlock
        icon={CreditCard}
        eyebrow="House Expenses"
        title="Money, settled calmly"
        body="Split shared costs, track IOUs, simplify debts, and keep receipts for this six-person house."
        action={
          <Button variant="premium" onClick={onOpenExpense}>
            <Plus className="size-4" />
            Expense
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3">
        <GlassCard className="p-4">
          <p className="text-xs font-bold text-muted-foreground">Your balance</p>
          <p className={cn("mt-2 text-2xl font-black", myBalance >= 0 ? "text-emerald-600" : "text-rose-600")}>
            {formatCurrency(myBalance)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {myBalance >= 0 ? "You are owed" : "You owe"}
          </p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-xs font-bold text-muted-foreground">Money balance</p>
          <p className="mt-2 text-2xl font-black">{summary.score}%</p>
          <Progress value={summary.score} className="mt-3" />
        </GlassCard>
      </div>

      <Tabs defaultValue="balances" className="w-full">
        <TabsList className="no-scrollbar grid w-full grid-cols-5 overflow-x-auto">
          <TabsTrigger value="balances">Balances</TabsTrigger>
          <TabsTrigger value="expenses">History</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
          <TabsTrigger value="ai">AI</TabsTrigger>
        </TabsList>

        <TabsContent value="balances" className="grid gap-3">
          <GlassCard className="p-4">
            <SectionHeader title="Monthly settlement summary" />
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-background/65 p-3">
                <p className="text-xs font-bold text-muted-foreground">House spending</p>
                <p className="mt-1 text-2xl font-black">{formatCurrency(summary.totalMonthly)}</p>
              </div>
              <div className="rounded-2xl bg-background/65 p-3">
                <p className="text-xs font-bold text-muted-foreground">Outstanding</p>
                <p className="mt-1 text-2xl font-black">{formatCurrency(summary.outstanding)}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {summary.simplified[0]
                ? `${userName(state, summary.simplified[0].from)} should settle ${formatCurrency(summary.simplified[0].amount)} with ${userName(state, summary.simplified[0].to)} first.`
                : "No settlement reminders right now."}
            </p>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <SectionHeader title="Simplified payments" />
              <Button size="sm" variant="outline" onClick={onOpenSettlement}>
                <Euro className="size-4" />
                Settle
              </Button>
            </div>
            <div className="grid gap-2">
              {summary.simplified.map((payment) => (
                <div key={`${payment.from}-${payment.to}-${payment.amount}`} className="rounded-2xl bg-background/65 p-3">
                  <p className="text-sm font-black">
                    {userName(state, payment.from)} pays {userName(state, payment.to)}
                  </p>
                  <p className="mt-1 text-lg font-black text-primary">{formatCurrency(payment.amount)}</p>
                </div>
              ))}
              {summary.simplified.length === 0 ? (
                <p className="text-sm text-muted-foreground">Everyone is settled right now.</p>
              ) : null}
            </div>
          </GlassCard>

          <div className="grid gap-2">
            {state.users.map((user) => {
              const balance = summary.balances.get(user.id) ?? 0;
              return (
                <GlassCard key={user.id} className="p-3">
                  <div className="flex items-center justify-between gap-3">
                    <PersonPill user={user} />
                    <span className={cn("font-black", balance >= 0 ? "text-emerald-600" : "text-rose-600")}>
                      {formatCurrency(balance)}
                    </span>
                  </div>
                </GlassCard>
              );
            })}
          </div>

          <GlassCard className="p-4">
            <SectionHeader title="Settlement history" />
            <div className="grid gap-2">
              {state.settlements.slice(0, 5).map((settlement) => (
                <div key={settlement.id} className="rounded-2xl bg-background/65 p-3 text-sm">
                  <p className="font-black">
                    {userName(state, settlement.payer)} paid {userName(state, settlement.receiver)}
                  </p>
                  <p className="text-muted-foreground">
                    {formatCurrency(moneyValue(settlement.amount))} - {settlementLabels[settlement.method]} - {relativeDay(settlement.settled_at)}
                  </p>
                </div>
              ))}
              {state.settlements.length === 0 ? (
                <p className="text-sm text-muted-foreground">No settlements yet.</p>
              ) : null}
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="expenses" className="grid gap-3">
          {activeExpenses.map((expense) => {
            const comments = state.money_comments.filter((comment) => comment.expense_id === expense.id);
            const receipt = state.receipts.find((item) => item.expense_id === expense.id);
            return (
              <GlassCard key={expense.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <Badge variant="info">{expense.category}</Badge>
                      <Badge variant="outline">{splitTypeLabels[expense.split_type]}</Badge>
                    </div>
                    <h3 className="truncate font-black">{expense.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {userName(state, expense.paid_by)} paid on {relativeDay(expense.paid_date)}
                    </p>
                  </div>
                  <p className="text-xl font-black">{formatCurrency(moneyValue(expense.amount))}</p>
                </div>
                {expense.notes ? (
                  <p className="mt-2 text-sm text-muted-foreground">{expense.notes}</p>
                ) : null}
                {expense.receipt_url ? (
                  <div className="mt-3 rounded-2xl bg-background/65 p-3 text-sm">
                    <div className="flex items-center gap-2 font-black">
                      <Receipt className="size-4 text-primary" />
                      Receipt saved
                    </div>
                    {receipt?.ai_summary ? (
                      <p className="mt-1 text-muted-foreground">{receipt.ai_summary}</p>
                    ) : null}
                  </div>
                ) : null}
                {comments.length ? (
                  <div className="mt-3 grid gap-2">
                    {comments.slice(0, 2).map((comment) => (
                      <div key={comment.id} className="rounded-2xl bg-background/65 p-3 text-sm">
                        <p className="font-bold">{userName(state, comment.author)}</p>
                        <p className="text-muted-foreground">{comment.body}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => onAddComment(expense)}>
                    <MessageCircle className="size-4" />
                    {comments.length}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onEditExpense(expense)}>
                    <Pencil className="size-4" />
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onDeleteExpense(expense)}>
                    <Trash2 className="size-4" />
                    Delete
                  </Button>
                </div>
              </GlassCard>
            );
          })}
          {activeExpenses.length === 0 ? (
            <GlassCard className="p-4 text-sm text-muted-foreground">
              No expenses yet. Add the first shared house cost when someone buys something.
            </GlassCard>
          ) : null}
        </TabsContent>

        <TabsContent value="reports" className="grid gap-3">
          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-muted-foreground">This month</p>
                <p className="mt-1 text-3xl font-black">{formatCurrency(summary.totalMonthly)}</p>
              </div>
              <PieChart className="size-9 text-primary" />
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <SectionHeader title="Category breakdown" />
            <div className="grid gap-3">
              {summary.categoryTotals.filter((item) => item.total > 0).map((item) => (
                <div key={item.category}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-bold">{item.category}</span>
                    <span className="font-black">{formatCurrency(item.total)}</span>
                  </div>
                  <Progress value={(item.total / maxCategory) * 100} />
                </div>
              ))}
              {summary.categoryTotals.every((item) => item.total === 0) ? (
                <p className="text-sm text-muted-foreground">Category charts appear after expenses are added.</p>
              ) : null}
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <SectionHeader title="Who paid most" />
            <div className="grid gap-2">
              {summary.paidByUser.map((item) => (
                <div key={item.user_id} className="flex items-center justify-between rounded-2xl bg-background/65 p-2 text-sm">
                  <span className="font-bold">{userName(state, item.user_id)}</span>
                  <span className="font-black">{formatCurrency(item.total)}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="budgets" className="grid gap-3">
          <GlassCard className="p-4">
            <SectionHeader
              title="Monthly budgets"
              action={
                <Button size="sm" variant="outline" onClick={onOpenBudget}>
                  <Plus className="size-4" />
                  Budget
                </Button>
              }
            />
            <div className="grid gap-3">
              {state.budgets.map((budget) => {
                const spent = summary.categoryTotals.find((item) => item.category === budget.category)?.total ?? 0;
                const limit = moneyValue(budget.monthly_limit);
                const percent = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
                return (
                  <div key={budget.id} className="rounded-2xl bg-background/65 p-3">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-black">{budget.category}</span>
                      <span className={cn("font-black", limit > 0 && spent > limit ? "text-rose-600" : "")}>
                        {formatCurrency(spent)} / {formatCurrency(limit)}
                      </span>
                    </div>
                    <Progress value={percent} />
                    {limit > 0 && spent > limit ? (
                      <p className="mt-2 text-xs font-bold text-rose-600">Budget warning</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <SectionHeader title="Recurring expenses" />
            <div className="grid gap-2">
              {state.recurring_expenses.map((expense) => (
                <div key={expense.id} className="rounded-2xl bg-background/65 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-black">{expense.title}</span>
                    <Badge variant={expense.active ? "success" : "outline"}>{expense.frequency}</Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {expense.category} - {formatCurrency(moneyValue(expense.amount))} - due {relativeDay(expense.next_due_date)}
                  </p>
                </div>
              ))}
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="ai" className="grid gap-3">
          <GlassCard className="p-4">
            <SectionHeader title="Money AI Assistant" />
            <div className="grid gap-2">
              {moneyMessages.slice(-5).map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={cn(
                    "rounded-2xl p-3 text-sm leading-5",
                    message.role === "assistant" ? "bg-background/65" : "bg-primary text-primary-foreground",
                  )}
                >
                  {message.content}
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {[
                "Who owes the most?",
                "How much did we spend this month?",
                "Who paid the most?",
                "Generate money report.",
              ].map((prompt) => (
                <Button key={prompt} size="sm" variant="outline" onClick={() => askMoneyAI(prompt)}>
                  {prompt}
                </Button>
              ))}
            </div>
            <form
              className="mt-3 grid grid-cols-[1fr_auto] gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                askMoneyAI(moneyPrompt);
              }}
            >
              <Input
                value={moneyPrompt}
                onChange={(event) => setMoneyPrompt(event.target.value)}
                placeholder="Ask about balances or spending..."
              />
              <Button type="submit" variant="premium">
                <MessageCircle className="size-4" />
              </Button>
            </form>
          </GlassCard>
        </TabsContent>
      </Tabs>
    </ScreenFrame>
  );
}

function HouseScreen({
  state,
  currentUser,
  onSwitchIdentity,
  onEnablePush,
  onVote,
  onOpenAnnouncement,
  onOpenGuests,
}: {
  state: HouseState;
  currentUser: HouseUser;
  onSwitchIdentity: () => void;
  onEnablePush: () => void;
  onVote: (complaint: Complaint, supports: boolean) => void;
  onOpenAnnouncement: () => void;
  onOpenGuests: () => void;
}) {
  const helpful = userById(state, state.stats.most_helpful_user_id);
  const improved = userById(state, state.stats.most_improved_user_id);
  const hasFairnessActivity =
    state.task_history.length > 0 ||
    state.points_ledger.length > 0 ||
    state.complaints.length > 0 ||
    state.rewards.length > 0;
  const activeGuests = state.guest_status.filter((item) => item.guest_staying);
  const guestCount = activeGuests.reduce((total, item) => total + item.guest_count, 0);

  return (
    <ScreenFrame>
      <HeaderBlock
        icon={Home}
        eyebrow="House"
        title="Rules, balance, and signals"
        body="Shared areas stay shared. Private rooms stay private. Points are for fairness."
        action={
          <Button variant="glass" onClick={onSwitchIdentity}>
            <Users className="size-4" />
            {currentUser.name}
          </Button>
        }
      />

      <GlassCard className="overflow-hidden p-0">
        <Image
          src="/house-plan.svg"
          alt="House floor plan"
          width={1200}
          height={900}
          className="aspect-[4/3] w-full object-cover"
          priority
        />
      </GlassCard>

      <div className="grid gap-3">
        {[
          "Everyone cleans their own bedroom.",
          "Shared areas are everyone's responsibility.",
          "Points exist for fairness, not punishment.",
          "Complaints should only be used for real problems.",
          "Guests create shared responsibility.",
        ].map((rule) => (
          <GlassCard key={rule} className="flex items-center gap-3 p-4">
            <div className="grid size-9 place-items-center rounded-2xl bg-emerald-500/14 text-emerald-700 dark:text-emerald-300">
              <Check className="size-4" />
            </div>
            <p className="text-sm font-bold">{rule}</p>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="p-4">
        <SectionHeader title="Bathroom rotation" />
        <div className="grid gap-3">
          <div className="rounded-2xl bg-background/65 p-3">
            <p className="font-black">Ground floor bathroom</p>
            <p className="text-sm text-muted-foreground">Everyone and guests use it.</p>
          </div>
          <div className="rounded-2xl bg-background/65 p-3">
            <p className="font-black">Top floor bathroom</p>
            <p className="text-sm text-muted-foreground">
              Uzair, Shahram, Hammad, Usama, and Ali only.
            </p>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-4">
        <SectionHeader
          title="Notice board"
          action={
            <Button size="sm" variant="outline" onClick={onOpenAnnouncement}>
              <Megaphone className="size-4" />
              Add
            </Button>
          }
        />
        <div className="grid gap-3">
          {state.house_announcements.filter((item) => item.active).slice(0, 4).map((notice) => (
            <div key={notice.id} className="rounded-2xl bg-background/65 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate font-black">{notice.title}</p>
                <Badge variant="outline">{notice.category}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{notice.body}</p>
              <p className="mt-2 text-xs font-bold text-muted-foreground">
                {userName(state, notice.author)} - {relativeDay(notice.created_at)}
              </p>
            </div>
          ))}
          {state.house_announcements.filter((item) => item.active).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No announcements yet. Add guests, repairs, or important house messages here.
            </p>
          ) : null}
        </div>
      </GlassCard>

      <GlassCard className="p-4">
        <SectionHeader
          title="Guest tracking"
          action={
            <Button size="sm" variant="outline" onClick={onOpenGuests}>
              <Users className="size-4" />
              Update
            </Button>
          }
        />
        <div className="rounded-2xl bg-background/65 p-3">
          <p className="font-black">
            {guestCount > 0 ? `${guestCount} guest${guestCount === 1 ? "" : "s"} staying` : "No guests staying"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Guests increase shared bathroom, trash, and kitchen load in AI fairness recommendations.
          </p>
        </div>
        {activeGuests.length > 0 ? (
          <div className="mt-3 grid gap-2">
            {activeGuests.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-2xl bg-background/65 p-2 text-sm">
                <span className="font-bold">{userName(state, item.user_id)}</span>
                <span className="font-black">{item.guest_count}</span>
              </div>
            ))}
          </div>
        ) : null}
      </GlassCard>

      <GlassCard className="p-4">
        <SectionHeader title="Fairness analytics" />
        <div className="grid gap-3">
          <div className="grid grid-cols-[auto_1fr] items-center gap-4 rounded-2xl bg-background/65 p-3">
            <ProgressRing value={state.stats.house_balance_score} label="balance" size={86} />
            <div>
              <p className="font-black">House Balance Score</p>
              <p className="text-sm text-muted-foreground">
                Positive actions, help, speed, missed tasks, and confirmed complaints are blended without turning the house into a toxic leaderboard.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-background/65 p-3">
              <p className="text-xs font-bold text-muted-foreground">Most helpful</p>
              <p className="mt-1 text-lg font-black">{helpful?.name ?? "Pending"}</p>
            </div>
            <div className="rounded-2xl bg-background/65 p-3">
              <p className="text-xs font-bold text-muted-foreground">Most improved</p>
              <p className="mt-1 text-lg font-black">{improved?.name ?? "Pending"}</p>
            </div>
          </div>
          {state.stats.heavy_distribution.map((item) => (
            <div key={item.user_id} className="grid grid-cols-[7rem_1fr_2rem] items-center gap-3">
              <span className="truncate text-sm font-bold">{userName(state, item.user_id)}</span>
              <Progress value={Math.min(100, item.count * 26)} />
              <span className="text-right text-sm font-black">{item.count}</span>
            </div>
          ))}
          <div className="rounded-2xl bg-background/65 p-3">
            <p className="mb-2 text-sm font-black">Monthly fairness ranking</p>
            {hasFairnessActivity ? (
              <div className="grid gap-2">
                {state.stats.monthly_fairness_rank.map((entry) => (
                  <div
                    key={entry.user_id}
                    className="grid grid-cols-[2rem_1fr_3rem] items-center gap-2 text-sm"
                  >
                    <span className="font-black">#{entry.rank}</span>
                    <span className="truncate font-bold">{userName(state, entry.user_id)}</span>
                    <span className="text-right font-black">{entry.score}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No real ranking yet. Complete house tasks first and HouseFair will build the
                balance from actual history.
              </p>
            )}
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-4">
        <SectionHeader title="Achievements" />
        {state.rewards.length > 0 ? (
          <div className="grid gap-3">
          {state.rewards.map((reward) => (
            <div key={reward.id} className="flex items-center gap-3 rounded-2xl bg-background/65 p-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-amber-500/18 text-amber-700 dark:text-amber-300">
                <Trophy className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-black">{reward.title}</p>
                <p className="text-sm text-muted-foreground">
                  {userName(state, reward.user_id)} - {reward.description}
                </p>
              </div>
            </div>
          ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No badges yet. Real achievements will appear after the house starts completing tasks.
          </p>
        )}
      </GlassCard>

      <GlassCard className="p-4">
        <SectionHeader title="Install HouseFair" />
        <div className="grid gap-3 text-sm">
          <div className="rounded-2xl bg-background/65 p-3">
            <p className="font-black">Android</p>
            <p className="text-muted-foreground">Add HouseFair to Home Screen from your browser menu.</p>
          </div>
          <div className="rounded-2xl bg-background/65 p-3">
            <p className="font-black">iPhone</p>
            <p className="text-muted-foreground">Safari, Share, then Add to Home Screen.</p>
          </div>
          <p className="text-muted-foreground">
            Once installed, enable notifications for tasks, complaints, AI plans, and groceries.
          </p>
        </div>
      </GlassCard>

      <GlassCard className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <SectionHeader title="House Issues" />
          <Badge variant="outline">{state.stats.open_complaints} open</Badge>
        </div>
        <div className="grid gap-3">
          {state.complaints.map((complaint) => (
            <div key={complaint.id} className="rounded-2xl bg-background/65 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black">{complaint.category}</p>
                  <p className="text-sm text-muted-foreground">
                    {issueTypeLabels[complaint.issue_type ?? "report"]} -{" "}
                    {userName(state, complaint.reporter)} about{" "}
                    {userName(state, complaint.person_involved)}
                  </p>
                </div>
                <Badge
                  variant={
                    complaint.status === "resolved" || complaint.status === "rejected"
                      ? "success"
                      : complaint.status === "confirmed"
                        ? "danger"
                        : "warning"
                  }
                >
                  {complaint.status}
                </Badge>
              </div>
              <p className="mt-2 text-sm">{complaint.description}</p>
              {["denied", "disputed", "open"].includes(complaint.status) ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button size="sm" variant="outline" onClick={() => onVote(complaint, true)}>
                    <ThumbsUp className="size-4" />
                    {complaint.confirm_votes}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onVote(complaint, false)}>
                    <ThumbsDown className="size-4" />
                    {complaint.reject_votes}
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-primary/12 text-primary">
              <Bell className="size-5" />
            </div>
            <div>
              <p className="font-black">Push notifications</p>
              <p className="text-sm text-muted-foreground">Tasks, groceries, AI, and complaints.</p>
            </div>
          </div>
          <Button size="sm" variant="premium" onClick={onEnablePush}>
            Enable
          </Button>
        </div>
      </GlassCard>
    </ScreenFrame>
  );
}

function HeaderBlock({
  icon: Icon,
  eyebrow,
  title,
  body,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <GlassCard className="overflow-hidden p-5">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex min-w-0 items-center gap-2 text-sm font-bold text-primary">
            <Icon className="size-4" />
            <span className="min-w-0 break-words">{eyebrow}</span>
          </div>
          <h1 className="break-words text-2xl font-black tracking-normal">{title}</h1>
          <p className="mt-2 break-words text-sm leading-5 text-muted-foreground">{body}</p>
        </div>
        {action ? <div className="w-full min-w-0 sm:w-auto sm:shrink-0">{action}</div> : null}
      </div>
    </GlassCard>
  );
}

function ScreenFrame({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="grid gap-4"
    >
      {children}
    </motion.div>
  );
}

function IdentityDialog({
  open,
  users,
  storedIdentity,
  onRegister,
  onVerify,
  onResetPin,
  onReset,
  onDismiss,
}: {
  open: boolean;
  users: HouseUser[];
  storedIdentity: DeviceIdentity | null;
  onRegister: (personId: string, pin: string, taskStyle: TaskStylePreference) => void;
  onVerify: (pin: string) => void;
  onResetPin: (currentPin: string, newPin: string) => void;
  onReset: () => void;
  onDismiss: () => void;
}) {
  const [selectedPersonId, setSelectedPersonId] = React.useState(
    storedIdentity?.personId ?? users[0]?.id ?? "",
  );
  const [pin, setPin] = React.useState("");
  const [newPin, setNewPin] = React.useState("");
  const [mode, setMode] = React.useState<"unlock" | "reset">("unlock");
  const [taskStyle, setTaskStyle] = React.useState<TaskStylePreference>("evening");
  const selectedUser =
    users.find((user) => user.id === storedIdentity?.personId) ?? null;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pin.length !== 4) {
      toast.error("Enter a 4-digit PIN");
      return;
    }

    if (storedIdentity && mode === "reset") {
      if (newPin.length !== 4) {
        toast.error("Enter a new 4-digit PIN");
        return;
      }
      onResetPin(pin, newPin);
    } else if (storedIdentity) {
      onVerify(pin);
    } else {
      onRegister(selectedPersonId, pin, taskStyle);
    }
    setPin("");
    setNewPin("");
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onDismiss()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {storedIdentity
              ? mode === "reset"
                ? "Reset your house PIN"
                : "Confirm your house PIN"
              : "Welcome to HouseFair AI"}
          </DialogTitle>
          <DialogDescription>
            {storedIdentity
              ? mode === "reset"
                ? "Use your current PIN once, then choose a new private 4-digit PIN for this device."
                : "This keeps housemates from casually opening another person's profile."
              : "Set up this phone for cleaning, money, groceries, and the AI house manager."}
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          {storedIdentity && selectedUser ? (
            <GlassCard className="p-4">
              <div className="flex items-center justify-between gap-3">
                <PersonPill user={selectedUser} />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setMode((current) => (current === "reset" ? "unlock" : "reset"));
                      setPin("");
                      setNewPin("");
                    }}
                  >
                    {mode === "reset" ? "Unlock" : "Reset PIN"}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={onReset}>
                    Switch
                  </Button>
                </div>
              </div>
            </GlassCard>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["Cleaning", ListChecks],
                  ["Money", Euro],
                  ["Groceries", ShoppingBasket],
                  ["AI assistant", Sparkles],
                ].map(([label, Icon]) => {
                  const ItemIcon = Icon as React.ComponentType<{ className?: string }>;
                  return (
                    <div key={label as string} className="rounded-2xl bg-background/65 p-3">
                      <ItemIcon className="mb-2 size-4 text-primary" />
                      <p className="text-xs font-black">{label as string}</p>
                    </div>
                  );
                })}
              </div>
              <Field label="Select roommate">
                <Select value={selectedPersonId} onValueChange={setSelectedPersonId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Preferred task style">
                <Select
                  value={taskStyle}
                  onValueChange={(value) => setTaskStyle(value as TaskStylePreference)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(taskStyleLabels) as TaskStylePreference[]).map((style) => (
                      <SelectItem key={style} value={style}>
                        {taskStyleLabels[style]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </>
          )}
          <Field
            label={
              storedIdentity
                ? mode === "reset"
                  ? "Current PIN"
                  : "House PIN"
                : "Create 4-digit PIN"
            }
          >
            <Input
              value={pin}
              onChange={(event) =>
                setPin(event.target.value.replace(/\D/g, "").slice(0, 4))
              }
              inputMode="numeric"
              autoComplete="one-time-code"
              type="password"
              placeholder="1234"
              required
            />
          </Field>
          {storedIdentity && mode === "reset" ? (
            <Field label="New 4-digit PIN">
              <Input
                value={newPin}
                onChange={(event) =>
                  setNewPin(event.target.value.replace(/\D/g, "").slice(0, 4))
                }
                inputMode="numeric"
                autoComplete="new-password"
                type="password"
                placeholder="5678"
                required
              />
            </Field>
          ) : null}
          <Button type="submit" variant="premium">
            <ShieldCheck className="size-4" />
            {storedIdentity
              ? mode === "reset"
                ? "Update PIN"
                : "Unlock"
              : "Create identity"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CompleteTaskDialog({
  open,
  state,
  session,
  apiFetch,
  selectedTask,
  onClose,
  onCompleted,
}: {
  open: boolean;
  state: HouseState;
  session: DeviceSession;
  apiFetch: (endpoint: string, init: RequestInit, queue?: Omit<QueuedAction, "id" | "createdAt">) => Promise<Response>;
  selectedTask: Task | null;
  onClose: () => void;
  onCompleted: (task: Task, points: number) => void;
}) {
  const [taskId, setTaskId] = React.useState(selectedTask?.id ?? "");
  const [pending, startTransition] = React.useTransition();

  const task = state.tasks.find((item) => item.id === taskId) ?? selectedTask;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!task) return;

    startTransition(async () => {
      try {
        const form = new FormData(event.currentTarget);
        const beforeFile = form.get("before") as File | null;
        const afterFile = form.get("after") as File | null;
        const beforeUrl =
          beforeFile && beforeFile.size > 0
            ? await uploadImage({
                file: beforeFile,
                taskId: task.id,
                kind: "before",
                session,
              })
            : null;
        const afterUrl =
          afterFile && afterFile.size > 0
            ? await uploadImage({
                file: afterFile,
                taskId: task.id,
                kind: "after",
                session,
              })
            : null;

        if (task.proof_required && (!beforeUrl || !afterUrl)) {
          throw new Error("Before and after photos are required for this task.");
        }

        const body = {
          taskId: task.id,
          beforeUrl,
          afterUrl,
          notes: String(form.get("notes") || ""),
        };

        const response = await apiFetch("/api/tasks/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }, {
          endpoint: "/api/tasks/complete",
          body,
          label: `Complete ${task.title}`,
        });

        if (!response.ok) {
          const error = (await response.json()) as { error?: string };
          throw new Error(error.error ?? "Task completion failed.");
        }

        const result = (await response.json()) as {
          task: Task;
          proof: { feedback: string; status: string };
        };
        onCompleted(result.task, task.points);
        navigator.vibrate?.(18);
        toast.success(result.proof.feedback);
        onClose();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Task completion failed");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete task</DialogTitle>
          <DialogDescription>Heavy tasks support before and after proof.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <Field label="Task">
            <Select value={taskId} onValueChange={setTaskId}>
              <SelectTrigger>
                <SelectValue placeholder="Select task" />
              </SelectTrigger>
              <SelectContent>
                {state.tasks
                  .filter((item) => item.status !== "completed")
                  .map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.title}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </Field>
          {task ? (
            <div className="rounded-2xl bg-muted p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-black">{task.location}</span>
                <Badge variant={difficultyBadge[task.difficulty]}>+{task.points}</Badge>
              </div>
              <p className="mt-1 text-xs font-bold text-muted-foreground">
                Estimated {taskMinutes(task)} minutes
              </p>
              <p className="mt-1 text-muted-foreground">{task.description}</p>
              <div className="mt-3 grid gap-2">
                {taskChecklist(task).map((item) => (
                  <label key={item} className="flex items-start gap-2 rounded-xl bg-background/70 p-2">
                    <input type="checkbox" className="mt-1 accent-primary" />
                    <span className="text-xs font-semibold leading-4">{item}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
          <Field label="Completion notes">
            <Textarea
              name="notes"
              placeholder="Anything useful? Example: food waste bag replaced, kettle descaled, shared pans cleaned."
            />
          </Field>
          {task?.proof_required ? (
            <div className="grid gap-3">
              <Field label="Before image">
                <Input name="before" type="file" accept="image/*" capture="environment" />
              </Field>
              <Field label="After image">
                <Input name="after" type="file" accept="image/*" capture="environment" />
              </Field>
            </div>
          ) : null}
          <Button type="submit" variant="premium" disabled={pending || !task}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            Complete
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ComplaintDialog({
  open,
  state,
  currentUser,
  session,
  apiFetch,
  onClose,
  onCreated,
}: {
  open: boolean;
  state: HouseState;
  currentUser: HouseUser;
  session: DeviceSession;
  apiFetch: (endpoint: string, init: RequestInit, queue?: Omit<QueuedAction, "id" | "createdAt">) => Promise<Response>;
  onClose: () => void;
  onCreated: (complaint: Complaint) => void;
}) {
  const [pending, startTransition] = React.useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        const form = new FormData(event.currentTarget);
        const image = form.get("image") as File | null;
        const imageUrl =
          image && image.size > 0
            ? await uploadImage({
                file: image,
                taskId: "complaint",
                kind: "complaint",
                session,
              })
            : null;

        const body = {
          person_involved: String(form.get("person_involved")),
          location: String(form.get("location")),
          issue_type: String(form.get("issue_type")),
          category: String(form.get("category")),
          description: String(form.get("description")),
          image_url: imageUrl,
        };

        const response = await apiFetch("/api/complaints", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }, {
          endpoint: "/api/complaints",
          body,
          label: "Report issue",
        });

        if (!response.ok) throw new Error("Complaint could not be saved.");
        const result = (await response.json()) as { complaint: Complaint };
        onCreated(result.complaint);
        toast.success("House issue saved");
        onClose();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Complaint failed");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>House Issue</DialogTitle>
          <DialogDescription>Use a softer reminder first when it is a small cleanup request.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <Field label="Workflow">
            <Select name="issue_type" defaultValue="cleanup_request">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(issueTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Category">
            <Select name="category" defaultValue="Dirty dishes">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {complaintCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Person involved">
            <Select name="person_involved" defaultValue={state.users[0]?.id}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {state.users
                  .filter((user) => user.id !== currentUser.id)
                  .map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Location">
            <Input name="location" placeholder="Kitchen" required />
          </Field>
          <Field label="Description">
            <Textarea name="description" placeholder="What happened?" required />
          </Field>
          <Field label="Image">
            <Input name="image" type="file" accept="image/*" />
          </Field>
          <Button type="submit" variant="premium" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <AlertTriangle className="size-4" />}
            Save issue
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function GroceryDialog({
  open,
  apiFetch,
  onClose,
  onCreated,
}: {
  open: boolean;
  apiFetch: (endpoint: string, init: RequestInit, queue?: Omit<QueuedAction, "id" | "createdAt">) => Promise<Response>;
  onClose: () => void;
  onCreated: (item: GroceryItem) => void;
}) {
  const [pending, startTransition] = React.useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        const form = new FormData(event.currentTarget);
        const body = {
          name: String(form.get("name")),
          category: String(form.get("category") || "Custom"),
          status: String(form.get("status") || "needed"),
          price: form.get("price") ? Number(form.get("price")) : null,
          notes: String(form.get("notes") || ""),
        };

        const response = await apiFetch("/api/groceries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }, {
          endpoint: "/api/groceries",
          body,
          label: `Add ${body.name}`,
        });

        if (!response.ok) throw new Error("Grocery item could not be saved.");
        const result = (await response.json()) as { item: GroceryItem };
        onCreated(result.item);
        toast.success("Grocery added");
        onClose();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Grocery failed");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add grocery</DialogTitle>
          <DialogDescription>New items are shared with the house database.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <Field label="Name">
            <Input name="name" placeholder="Milk" required />
          </Field>
          <Field label="Category">
            <Input name="category" placeholder="Fresh" />
          </Field>
          <Field label="Status">
            <Select name="status" defaultValue="needed">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Price">
            <Input name="price" type="number" min="0" step="0.01" placeholder="0.00" />
          </Field>
          <Field label="Notes">
            <Textarea name="notes" placeholder="Any brand or shop preference?" />
          </Field>
          <Button type="submit" variant="premium" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Add item
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BarcodeDialog({
  open,
  apiFetch,
  onClose,
  onCreated,
}: {
  open: boolean;
  apiFetch: (endpoint: string, init: RequestInit, queue?: Omit<QueuedAction, "id" | "createdAt">) => Promise<Response>;
  onClose: () => void;
  onCreated: (item: GroceryItem) => void;
}) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const [barcode, setBarcode] = React.useState("");
  const [scannerStatus, setScannerStatus] = React.useState("Camera scanner is ready when supported.");
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (!open) return;

    let cancelled = false;
    let timer: number | null = null;

    async function startScanner() {
      const detectorClass = (
        window as typeof window & {
          BarcodeDetector?: new (options?: { formats?: string[] }) => {
            detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
          };
        }
      ).BarcodeDetector;

      if (!detectorClass || !navigator.mediaDevices?.getUserMedia) {
        setScannerStatus("Camera barcode detection is not supported here. Enter the barcode manually.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const detector = new detectorClass({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
        });
        setScannerStatus("Point camera at the barcode.");
        timer = window.setInterval(async () => {
          if (!videoRef.current) return;
          const codes = await detector.detect(videoRef.current).catch(() => []);
          const rawValue = codes[0]?.rawValue;
          if (rawValue) {
            setBarcode(rawValue);
            setScannerStatus("Barcode detected.");
            navigator.vibrate?.(12);
          }
        }, 700);
      } catch {
        setScannerStatus("Camera permission was not available. Enter the barcode manually.");
      }
    }

    void startScanner();

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [open]);

  const suggestion = React.useMemo(() => {
    const clean = barcode.trim();
    const suffix = clean.slice(-4) || "item";
    const likelyFresh = clean.startsWith("2") || clean.startsWith("02");
    return {
      name: clean ? `Scanned item ${suffix}` : "",
      category: likelyFresh ? "Fresh" : "Pantry",
      notes: clean ? `Barcode: ${clean}. Suggested by HouseFair scanner. Check purchase rhythm after first buys.` : "",
    };
  }, [barcode]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        const form = new FormData(event.currentTarget);
        const body = {
          name: String(form.get("name")),
          category: String(form.get("category") || suggestion.category),
          status: "needed",
          price: null,
          notes: String(form.get("notes") || suggestion.notes),
        };
        const response = await apiFetch("/api/groceries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error("Scanned item could not be added.");
        const result = (await response.json()) as { item: GroceryItem };
        onCreated(result.item);
        toast.success("Scanned grocery added");
        onClose();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Barcode scan failed");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Scan grocery barcode</DialogTitle>
          <DialogDescription>Camera scanning is optional. You can edit the suggested item before adding it.</DialogDescription>
        </DialogHeader>
        <div className="overflow-hidden rounded-3xl border bg-black">
          <video ref={videoRef} className="h-44 w-full object-cover" muted playsInline />
        </div>
        <p className="text-sm text-muted-foreground">{scannerStatus}</p>
        <form className="grid gap-4" onSubmit={submit}>
          <Field label="Barcode">
            <Input
              value={barcode}
              onChange={(event) => setBarcode(event.target.value.replace(/[^\dA-Za-z-]/g, "").slice(0, 48))}
              placeholder="Scan or enter barcode"
              inputMode="numeric"
            />
          </Field>
          <Field label="Suggested name">
            <Input name="name" key={suggestion.name} defaultValue={suggestion.name} placeholder="Milk 2L" required />
          </Field>
          <Field label="Suggested category">
            <Input name="category" key={suggestion.category} defaultValue={suggestion.category} />
          </Field>
          <Field label="Notes">
            <Textarea name="notes" key={suggestion.notes} defaultValue={suggestion.notes} />
          </Field>
          <Button type="submit" variant="premium" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <ShoppingBasket className="size-4" />}
            Add scanned item
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MoneyExpenseDialog({
  open,
  state,
  currentUser,
  session,
  editingExpense,
  apiFetch,
  onClose,
  onCreated,
  onUpdated,
}: {
  open: boolean;
  state: HouseState;
  currentUser: HouseUser;
  session: DeviceSession;
  editingExpense?: Expense | null;
  apiFetch: (endpoint: string, init: RequestInit, queue?: Omit<QueuedAction, "id" | "createdAt">) => Promise<Response>;
  onClose: () => void;
  onCreated: (data: {
    expense: Expense;
    splits: ExpenseSplit[];
    comment?: MoneyComment | null;
    receipt?: MoneyReceipt | null;
  }) => void;
  onUpdated: (data: { expense: Expense; splits: ExpenseSplit[] }) => void;
}) {
  const [pending, startTransition] = React.useTransition();
  const editingSplits = React.useMemo(
    () =>
      editingExpense
        ? state.expense_splits.filter((split) => split.expense_id === editingExpense.id)
        : [],
    [editingExpense, state.expense_splits],
  );
  const initialSplitType = editingExpense?.split_type ?? "equal";
  const initialExpenseKind =
    editingExpense?.category === "Other" &&
    initialSplitType === "exact" &&
    editingSplits.filter((split) => moneyValue(split.amount_owed) > 0.01).length === 1
      ? "iou"
      : "shared";
  const initialBorrower =
    editingSplits.find((split) => moneyValue(split.amount_owed) > 0.01)?.user_id ??
    state.users.find((user) => user.id !== (editingExpense?.paid_by ?? currentUser.id))?.id ??
    currentUser.id;
  const [splitType, setSplitType] = React.useState<SplitType>(initialSplitType);
  const [splitValues, setSplitValues] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(
      editingSplits.map((split) => [
        split.user_id,
        String(moneyValue(split.split_value ?? split.amount_owed)),
      ]),
    ),
  );
  const [expenseKind, setExpenseKind] = React.useState<"shared" | "iou">(initialExpenseKind);
  const [iouBorrower, setIouBorrower] = React.useState(initialBorrower);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        const form = new FormData(event.currentTarget);
        const receiptFile = form.get("receipt") as File | null;
        const paidBy = String(form.get("paid_by"));
        const amount = Number(form.get("amount"));
        const borrowerId =
          state.users.some((user) => user.id === iouBorrower && user.id !== paidBy)
            ? iouBorrower
            : (state.users.find((user) => user.id !== paidBy)?.id ?? paidBy);
        const borrowerName = userName(state, borrowerId);
        const lenderName = userName(state, paidBy);
        const title = String(
          form.get("title") ||
            (expenseKind === "iou" ? `IOU: ${borrowerName} borrowed from ${lenderName}` : ""),
        );
        const category =
          expenseKind === "iou" ? "Other" : (String(form.get("category")) as MoneyCategory);
        const receiptUrl =
          receiptFile && receiptFile.size > 0
            ? await uploadImage({
                file: receiptFile,
                taskId: "receipt",
                kind: "money",
                session,
              })
            : (editingExpense?.receipt_url ?? null);
        const splits =
          expenseKind === "iou"
            ? Object.fromEntries(state.users.map((user) => [user.id, user.id === borrowerId ? amount : 0]))
            : Object.fromEntries(
                state.users.map((user) => [user.id, Number(splitValues[user.id] || 0)]),
              );
        const body = {
          ...(editingExpense ? { expenseId: editingExpense.id } : {}),
          title,
          amount,
          category,
          paid_by: paidBy,
          paid_date: String(form.get("paid_date")),
          notes: String(form.get("notes") || ""),
          receipt_url: receiptUrl,
          comments: String(form.get("comments") || ""),
          split_type: expenseKind === "iou" ? "exact" : splitType,
          splits,
        };

        const response = await apiFetch("/api/money/expenses", {
          method: editingExpense ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const error = (await response.json()) as { error?: string };
          throw new Error(error.error ?? "Expense could not be saved.");
        }
        const result = (await response.json()) as {
          expense: Expense;
          splits: ExpenseSplit[];
          comment?: MoneyComment | null;
          receipt?: MoneyReceipt | null;
        };
        if (editingExpense) {
          onUpdated({ expense: result.expense, splits: result.splits });
          toast.success("Expense updated");
        } else {
          onCreated(result);
          toast.success(expenseKind === "iou" ? "IOU added" : "Expense added");
        }
        onClose();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Expense failed");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingExpense ? "Edit expense" : "Add expense"}</DialogTitle>
          <DialogDescription>Shared only inside the House Expenses group.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          {!editingExpense ? (
            <Field label="Type">
              <Select value={expenseKind} onValueChange={(value) => setExpenseKind(value as "shared" | "iou")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="shared">Shared expense</SelectItem>
                  <SelectItem value="iou">Personal IOU</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          ) : null}
          <Field label="Title">
            <Input
              name="title"
              placeholder={expenseKind === "iou" ? "Ali borrowed cash" : "Milk and bread"}
              defaultValue={editingExpense?.title ?? ""}
              required={expenseKind === "shared"}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount">
              <Input
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                defaultValue={editingExpense ? moneyValue(editingExpense.amount) : undefined}
                required
              />
            </Field>
            <Field label="Date">
              <Input
                name="paid_date"
                type="date"
                defaultValue={editingExpense ? taskDueKey(editingExpense.paid_date) : dateKey(new Date())}
                required
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {expenseKind === "shared" ? (
              <Field label="Category">
                <Select name="category" defaultValue={editingExpense?.category ?? "Food"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {moneyCategories.map((category) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : null}
            <Field label="Paid by">
              <Select name="paid_by" defaultValue={editingExpense?.paid_by ?? currentUser.id}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {state.users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          {expenseKind === "iou" ? (
            <Field label="Borrower">
              <Select value={iouBorrower} onValueChange={setIouBorrower}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {state.users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : (
            <Field label="Split type">
              <Select value={splitType} onValueChange={(value) => setSplitType(value as SplitType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(splitTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          {expenseKind === "shared" && splitType !== "equal" ? (
            <div className="grid gap-2 rounded-2xl bg-muted p-3">
              <p className="text-xs font-bold text-muted-foreground">
                {splitType === "percentage"
                  ? "Percent per person, total must be 100"
                  : splitType === "shares"
                    ? "Share weights per person"
                    : "Euro amount per person, total must match amount"}
              </p>
              {state.users.map((user) => (
                <div key={user.id} className="grid grid-cols-[1fr_6rem] items-center gap-2">
                  <span className="text-sm font-bold">{user.name}</span>
                  <Input
                    value={splitValues[user.id] ?? ""}
                    onChange={(event) =>
                      setSplitValues((current) => ({ ...current, [user.id]: event.target.value }))
                    }
                    type="number"
                    min="0"
                    step={splitType === "shares" ? "1" : "0.01"}
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          ) : null}
          <Field label={expenseKind === "iou" ? "Receipt image optional" : "Receipt image"}>
            <Input name="receipt" type="file" accept="image/*" />
          </Field>
          <Field label="Notes">
            <Textarea
              name="notes"
              placeholder="Anything important about this expense?"
              defaultValue={editingExpense?.notes ?? ""}
            />
          </Field>
          {!editingExpense ? (
            <Field label="Comment">
              <Textarea name="comments" placeholder="Optional first comment" />
            </Field>
          ) : null}
          <Button type="submit" variant="premium" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Euro className="size-4" />}
            {editingExpense ? "Update expense" : expenseKind === "iou" ? "Save IOU" : "Save expense"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SettlementDialog({
  open,
  state,
  currentUser,
  apiFetch,
  onClose,
  onCreated,
}: {
  open: boolean;
  state: HouseState;
  currentUser: HouseUser;
  apiFetch: (endpoint: string, init: RequestInit, queue?: Omit<QueuedAction, "id" | "createdAt">) => Promise<Response>;
  onClose: () => void;
  onCreated: (settlement: Settlement) => void;
}) {
  const [pending, startTransition] = React.useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        const form = new FormData(event.currentTarget);
        const body = {
          payer: String(form.get("payer")),
          receiver: String(form.get("receiver")),
          amount: Number(form.get("amount")),
          method: String(form.get("method")),
          notes: String(form.get("notes") || ""),
          settled_at: String(form.get("settled_at")),
        };
        const response = await apiFetch("/api/money/settlements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error("Settlement could not be saved.");
        const result = (await response.json()) as { settlement: Settlement };
        onCreated(result.settlement);
        toast.success("Settlement saved");
        onClose();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Settlement failed");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settle up</DialogTitle>
          <DialogDescription>Record cash, bank transfer, or another repayment.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Payer">
              <Select name="payer" defaultValue={currentUser.id}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {state.users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Receiver">
              <Select name="receiver" defaultValue={state.users.find((user) => user.id !== currentUser.id)?.id}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {state.users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount">
              <Input name="amount" type="number" min="0.01" step="0.01" required />
            </Field>
            <Field label="Date">
              <Input name="settled_at" type="date" defaultValue={dateKey(new Date())} required />
            </Field>
          </div>
          <Field label="Method">
            <Select name="method" defaultValue="bank_transfer">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(settlementLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Notes">
            <Textarea name="notes" placeholder="Reference, Revolut, cash, etc." />
          </Field>
          <Button type="submit" variant="premium" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Save settlement
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BudgetDialog({
  open,
  apiFetch,
  onClose,
  onUpdated,
}: {
  open: boolean;
  apiFetch: (endpoint: string, init: RequestInit, queue?: Omit<QueuedAction, "id" | "createdAt">) => Promise<Response>;
  onClose: () => void;
  onUpdated: (budget: Budget) => void;
}) {
  const [pending, startTransition] = React.useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        const form = new FormData(event.currentTarget);
        const body = {
          category: String(form.get("category")),
          monthly_limit: Number(form.get("monthly_limit")),
        };
        const response = await apiFetch("/api/money/budgets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error("Budget could not be saved.");
        const result = (await response.json()) as { budget: Budget };
        onUpdated(result.budget);
        toast.success("Budget updated");
        onClose();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Budget failed");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Monthly budget</DialogTitle>
          <DialogDescription>Set a simple category budget for the house.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <Field label="Category">
            <Select name="category" defaultValue="Food">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {moneyCategories.map((category) => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Monthly limit">
            <Input name="monthly_limit" type="number" min="0" step="0.01" placeholder="300" required />
          </Field>
          <Button type="submit" variant="premium" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <PieChart className="size-4" />}
            Save budget
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AnnouncementDialog({
  open,
  apiFetch,
  onClose,
  onCreated,
}: {
  open: boolean;
  apiFetch: (endpoint: string, init: RequestInit, queue?: Omit<QueuedAction, "id" | "createdAt">) => Promise<Response>;
  onClose: () => void;
  onCreated: (announcement: HouseAnnouncement) => void;
}) {
  const [pending, startTransition] = React.useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        const form = new FormData(event.currentTarget);
        const body = {
          title: String(form.get("title")),
          body: String(form.get("body")),
          category: String(form.get("category") || "message"),
        };

        const response = await apiFetch("/api/house/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!response.ok) throw new Error("Announcement could not be saved.");
        const result = (await response.json()) as { announcement: HouseAnnouncement };
        onCreated(result.announcement);
        toast.success("Announcement posted");
        onClose();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Announcement failed");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>House announcement</DialogTitle>
          <DialogDescription>Post guests, repairs, or important messages for everyone.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <Field label="Category">
            <Select name="category" defaultValue="message">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="message">Message</SelectItem>
                <SelectItem value="guests">Guests</SelectItem>
                <SelectItem value="repairs">Repairs</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Title">
            <Input name="title" placeholder="Guests tonight" required />
          </Field>
          <Field label="Message">
            <Textarea name="body" placeholder="What should the house know?" required />
          </Field>
          <Button type="submit" variant="premium" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Megaphone className="size-4" />}
            Post
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function GuestDialog({
  open,
  currentGuest,
  apiFetch,
  onClose,
  onUpdated,
}: {
  open: boolean;
  currentGuest: GuestStatus | null;
  apiFetch: (endpoint: string, init: RequestInit, queue?: Omit<QueuedAction, "id" | "createdAt">) => Promise<Response>;
  onClose: () => void;
  onUpdated: (guest: GuestStatus) => void;
}) {
  const [pending, startTransition] = React.useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        const form = new FormData(event.currentTarget);
        const guestCount = Number(form.get("guest_count") || 0);
        const body = {
          guest_staying: guestCount > 0,
          guest_count: guestCount,
          notes: String(form.get("notes") || ""),
        };

        const response = await apiFetch("/api/house/guests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!response.ok) throw new Error("Guest status could not be saved.");
        const result = (await response.json()) as { guest: GuestStatus };
        onUpdated(result.guest);
        toast.success("Guest status updated");
        onClose();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Guest update failed");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Guest tracking</DialogTitle>
          <DialogDescription>Guests affect kitchen, bathroom, and trash fairness.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <Field label="Number of guests staying">
            <Input
              name="guest_count"
              type="number"
              min="0"
              max="8"
              defaultValue={currentGuest?.guest_count ?? 0}
            />
          </Field>
          <Field label="Notes">
            <Textarea
              name="notes"
              placeholder="Example: staying Friday night"
              defaultValue={currentGuest?.notes ?? ""}
            />
          </Field>
          <Button type="submit" variant="premium" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Users className="size-4" />}
            Update guests
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FirstWeekSetupDialog({
  open,
  state,
  apiFetch,
  onClose,
  onSaved,
}: {
  open: boolean;
  state: HouseState;
  apiFetch: (endpoint: string, init: RequestInit) => Promise<Response>;
  onClose: () => void;
  onSaved: (setting: HouseState["house_settings"][number]) => void;
}) {
  const [pending, startTransition] = React.useTransition();
  const current = setupSetting(state);

  function stringSetting(key: string, fallback: string) {
    const value = current[key];
    return typeof value === "string" ? value : fallback;
  }

  function booleanSetting(key: string, fallback: boolean) {
    const value = current[key];
    return typeof value === "boolean" ? value : fallback;
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        const form = new FormData(event.currentTarget);
        const body = {
          cleaning_day: String(form.get("cleaning_day")),
          bin_reminder: String(form.get("bin_reminder")),
          weekly_report_day: String(form.get("weekly_report_day")),
          monthly_settlement_day: Number(form.get("monthly_settlement_day")),
          notify_tasks: form.get("notify_tasks") === "on",
          notify_money: form.get("notify_money") === "on",
          notify_groceries: form.get("notify_groceries") === "on",
        };
        const response = await apiFetch("/api/house/setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error("First-week setup could not be saved.");
        const result = (await response.json()) as { setting: HouseState["house_settings"][number] };
        onSaved(result.setting);
        toast.success("First-week setup saved");
        onClose();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Setup failed");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>First-week setup</DialogTitle>
          <DialogDescription>Configure the practical defaults for the house launch week.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cleaning day">
              <Select name="cleaning_day" defaultValue={stringSetting("cleaning_day", "Sunday")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                    <SelectItem key={day} value={day}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Bin reminder">
              <Select name="bin_reminder" defaultValue={stringSetting("bin_reminder", "Thursday evening")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Thursday evening">Thursday evening</SelectItem>
                  <SelectItem value="Friday morning">Friday morning</SelectItem>
                  <SelectItem value="Both">Both</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Weekly report">
              <Select name="weekly_report_day" defaultValue={stringSetting("weekly_report_day", "Sunday")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Friday", "Saturday", "Sunday", "Monday"].map((day) => (
                    <SelectItem key={day} value={day}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Settlement day">
              <Input
                name="monthly_settlement_day"
                type="number"
                min="1"
                max="28"
                defaultValue={String(current.monthly_settlement_day ?? 28)}
              />
            </Field>
          </div>
          <div className="grid gap-2 rounded-2xl bg-muted p-3">
            {[
              ["notify_tasks", "Task reminders", booleanSetting("notify_tasks", true)],
              ["notify_money", "Money reminders", booleanSetting("notify_money", true)],
              ["notify_groceries", "Grocery reminders", booleanSetting("notify_groceries", true)],
            ].map(([name, label, enabled]) => (
              <label key={name as string} className="flex items-center justify-between gap-3 rounded-xl bg-background/70 p-3 text-sm font-bold">
                <span>{label as string}</span>
                <input name={name as string} type="checkbox" defaultChecked={Boolean(enabled)} className="size-4 accent-primary" />
              </label>
            ))}
          </div>
          <Button type="submit" variant="premium" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Settings className="size-4" />}
            Save setup
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MyProfileScreen({
  state,
  currentUser,
}: {
  state: HouseState;
  currentUser: HouseUser;
}) {
  const myHistory = state.task_history.filter((item) => item.completed_by === currentUser.id);
  const points = userPointsFromLedger(state, currentUser.id);
  const level = profileLevel(points, myHistory.length);
  const rewards = state.rewards.filter((item) => item.user_id === currentUser.id);
  const preference = state.user_preferences.find((item) => item.user_id === currentUser.id);
  const moneyPaid = userMoneyContribution(state, currentUser.id);
  const money = calculateMoneySummary(state);
  const myBalance = money.balances.get(currentUser.id) ?? 0;

  return (
    <div className="grid gap-3">
      <GlassCard className="overflow-hidden p-4">
        <div className="flex items-center gap-4">
          <Avatar className="size-16">
            <AvatarFallback name={currentUser.name} gradient={currentUser.avatar_gradient} />
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
              My Profile
            </p>
            <h2 className="truncate text-2xl font-black">{currentUser.name}</h2>
            <p className="text-sm font-semibold text-muted-foreground">{currentUser.room_name}</p>
          </div>
          <Badge variant="info">Level {level.level}</Badge>
        </div>
        <div className="mt-4 rounded-2xl bg-background/65 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-black">{level.title}</p>
              <p className="text-xs text-muted-foreground">
                {level.next ? `Next: ${level.next}` : "Top level reached"}
              </p>
            </div>
            <p className="text-xl font-black">{points}</p>
          </div>
          <Progress value={level.progress} className="mt-3" />
        </div>
      </GlassCard>

      <div className="grid grid-cols-2 gap-3">
        <GlassCard className="p-4">
          <p className="text-xs font-bold text-muted-foreground">Streak</p>
          <p className="mt-2 text-2xl font-black">{currentUser.cleaning_streak}</p>
          <p className="text-xs text-muted-foreground">cleaning run</p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-xs font-bold text-muted-foreground">Money paid</p>
          <p className="mt-2 text-2xl font-black">{formatCurrency(moneyPaid)}</p>
          <p className={cn("text-xs", myBalance >= 0 ? "text-emerald-600" : "text-rose-600")}>
            Balance {formatCurrency(myBalance)}
          </p>
        </GlassCard>
      </div>

      <GlassCard className="p-4">
        <SectionHeader title="Preferences" />
        <div className="grid gap-2">
          <div className="flex items-center justify-between rounded-2xl bg-background/65 p-3 text-sm">
            <span className="font-bold">Preferred task style</span>
            <Badge variant="outline">
              {preference ? taskStyleLabels[preference.task_style] : "Not set"}
            </Badge>
          </div>
          {state.availability
            .filter((item) => item.user_id === currentUser.id)
            .slice(0, 3)
            .map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-2xl bg-background/65 p-3 text-sm">
                <span className="font-bold">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][item.day_of_week]}
                </span>
                <span className="text-muted-foreground">
                  {item.unavailable ? "Unavailable" : item.preferred_window}
                </span>
              </div>
            ))}
        </div>
      </GlassCard>

      <GlassCard className="p-4">
        <SectionHeader title="Badges" />
        <div className="grid grid-cols-2 gap-2">
          {rewards.map((reward) => (
            <div key={reward.id} className="rounded-2xl bg-background/65 p-3">
              <Trophy className="mb-2 size-5 text-amber-500" />
              <p className="text-sm font-black">{reward.title || rewardLabel(reward.kind)}</p>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{reward.description}</p>
            </div>
          ))}
          {rewards.length === 0 ? (
            <p className="col-span-2 text-sm text-muted-foreground">
              Badges unlock automatically from real task history.
            </p>
          ) : null}
        </div>
      </GlassCard>

      <GlassCard className="p-4">
        <SectionHeader title="Task history" />
        <div className="grid gap-2">
          {myHistory.slice(0, 8).map((history) => {
            const task = state.tasks.find((item) => item.id === history.task_id);
            return (
              <div key={history.id} className="flex items-center justify-between gap-3 rounded-2xl bg-background/65 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">{task?.title ?? "Completed task"}</p>
                  <p className="text-xs text-muted-foreground">
                    {relativeDay(history.completed_at)} - {history.difficulty}
                  </p>
                </div>
                <Badge variant={difficultyBadge[history.difficulty]}>+{history.points_awarded}</Badge>
              </div>
            );
          })}
          {myHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">Your completed tasks will appear here.</p>
          ) : null}
        </div>
      </GlassCard>
    </div>
  );
}

function NotificationCenterScreen({
  state,
  currentUser,
  onEnablePush,
}: {
  state: HouseState;
  currentUser: HouseUser;
  onEnablePush: () => void;
}) {
  const groups = groupedNotifications(state, currentUser);

  return (
    <div className="grid gap-3">
      <GlassCard className="p-4">
        <SectionHeader
          title="Notification center"
          action={
            <Button size="sm" variant="outline" onClick={onEnablePush}>
              <Bell className="size-4" />
              Enable
            </Button>
          }
        />
        <p className="text-sm leading-5 text-muted-foreground">
          Smart task, money, grocery, issue, and AI reminders appear here even before push is enabled.
        </p>
      </GlassCard>
      {(Object.keys(groups) as Array<keyof typeof groups>).map((label) => (
        <GlassCard key={label} className="p-4">
          <SectionHeader title={label} />
          <div className="grid gap-2">
            {groups[label].map((notification) => (
              <div key={notification.id} className="rounded-2xl bg-background/65 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words font-black">{notification.title}</p>
                    <p className="mt-1 break-words text-sm leading-5 text-muted-foreground">
                      {notification.body}
                    </p>
                  </div>
                  <Badge variant={notification.read_at ? "outline" : "info"}>
                    {notification.type}
                  </Badge>
                </div>
              </div>
            ))}
            {groups[label].length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing here.</p>
            ) : null}
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

function MoreScreen({
  state,
  currentUser,
  apiFetch,
  onSwitchIdentity,
  onEnablePush,
  onVote,
  onOpenAnnouncement,
  onOpenGuests,
  onOpenSetup,
  onHouseMode,
  onAcceptRules,
  onWeeklyReport,
  onMaintenance,
}: {
  state: HouseState;
  currentUser: HouseUser;
  apiFetch: (endpoint: string, init: RequestInit) => Promise<Response>;
  onSwitchIdentity: () => void;
  onEnablePush: () => void;
  onVote: (complaint: Complaint, supports: boolean) => void;
  onOpenAnnouncement: () => void;
  onOpenGuests: () => void;
  onOpenSetup: () => void;
  onHouseMode: (mode: HouseState["house_mode"]) => void;
  onAcceptRules: () => void;
  onWeeklyReport: () => void;
  onMaintenance: (action: "export_data" | "export_csv" | "export_pdf" | "reset_points" | "reset_test_data" | "audit_logs") => void;
}) {
  const accepted = state.house_rule_acceptances.some((item) => item.user_id === currentUser.id);
  const latestReport = state.weekly_reports[0] as WeeklyReport | undefined;

  return (
    <ScreenFrame>
      <HeaderBlock
        icon={Settings}
        eyebrow="More"
        title="House controls"
        body="AI, rules, house mode, weekly reports, and protected maintenance tools."
        action={
          <Button className="w-full sm:w-auto" variant="glass" onClick={onSwitchIdentity}>
            <Users className="size-4" />
            {currentUser.name}
          </Button>
        }
      />

      <GlassCard className="p-4">
        <SectionHeader title="House Mode" />
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(houseModeLabels) as HouseState["house_mode"][]).map((mode) => (
            <Button
              key={mode}
              variant={state.house_mode === mode ? "default" : "outline"}
              className="h-auto whitespace-normal py-3 leading-tight"
              onClick={() => onHouseMode(mode)}
            >
              {houseModeLabels[mode]}
            </Button>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{houseModeNotes[state.house_mode]}</p>
      </GlassCard>

      <Tabs defaultValue="ai" className="w-full">
        <TabsList className="no-scrollbar flex w-full justify-start overflow-x-auto">
          <TabsTrigger value="ai">AI</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Alerts</TabsTrigger>
          <TabsTrigger value="house">House</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="ai">
          <AIManagerScreen state={state} apiFetch={apiFetch} />
          <GlassCard className="mt-4 p-4">
            <SectionHeader
              title="Weekly report"
              action={
                <Button size="sm" variant="outline" onClick={onWeeklyReport}>
                  <FileDown className="size-4" />
                  Generate
                </Button>
              }
            />
            {latestReport ? (
              <p className="text-sm text-muted-foreground">
                Latest report week: {relativeDay(latestReport.week_start)}. Cleaning score{" "}
                {String(latestReport.report.cleaning_score ?? state.stats.house_cleanliness)}%.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Generate a weekly cleaning, money, problems, and suggestions report.
              </p>
            )}
          </GlassCard>
        </TabsContent>

        <TabsContent value="profile" className="grid gap-3">
          <MyProfileScreen state={state} currentUser={currentUser} />
        </TabsContent>

        <TabsContent value="notifications" className="grid gap-3">
          <NotificationCenterScreen
            state={state}
            currentUser={currentUser}
            onEnablePush={onEnablePush}
          />
        </TabsContent>

        <TabsContent value="house">
          <HouseScreen
            state={state}
            currentUser={currentUser}
            onSwitchIdentity={onSwitchIdentity}
            onEnablePush={onEnablePush}
            onVote={onVote}
            onOpenAnnouncement={onOpenAnnouncement}
            onOpenGuests={onOpenGuests}
          />
        </TabsContent>

        <TabsContent value="rules" className="grid gap-3">
          <GlassCard className="p-4">
            <SectionHeader title="House Rules Agreement" />
            <div className="grid gap-2">
              {[
                "Everyone cleans their own bedroom.",
                "Shared areas are everyone's responsibility.",
                "Points exist for fairness, not punishment.",
                "Issues should only be used for real problems.",
                "Guests create shared responsibility.",
                "Money entries should be honest and settled calmly.",
              ].map((rule) => (
                <div key={rule} className="flex items-start gap-2 rounded-2xl bg-background/65 p-3 text-sm font-semibold">
                  <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  <span>{rule}</span>
                </div>
              ))}
            </div>
            <Button className="mt-4 w-full" variant={accepted ? "outline" : "premium"} onClick={onAcceptRules}>
              <ShieldCheck className="size-4" />
              {accepted ? "Accepted" : "Accept house rules"}
            </Button>
          </GlassCard>
        </TabsContent>

        <TabsContent value="settings" className="grid gap-3">
          <GlassCard className="p-4">
            <SectionHeader title="Maintenance settings" />
            <p className="text-sm text-muted-foreground">
              Protected by the maintenance PIN. Use these for household upkeep only.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => onMaintenance("export_data")}>Export JSON</Button>
              <Button variant="outline" onClick={() => onMaintenance("export_csv")}>Export CSV</Button>
              <Button variant="outline" onClick={() => onMaintenance("export_pdf")}>Export PDF</Button>
              <Button variant="outline" onClick={() => onMaintenance("audit_logs")}>Audit logs</Button>
              <Button variant="outline" onClick={() => onMaintenance("reset_points")}>Reset points</Button>
              <Button variant="destructive" onClick={() => onMaintenance("reset_test_data")}>Reset test data</Button>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <SectionHeader
              title="First-week setup"
              action={
                <Button size="sm" variant="outline" onClick={onOpenSetup}>
                  <Settings className="size-4" />
                  Configure
                </Button>
              }
            />
            <p className="text-sm leading-5 text-muted-foreground">
              Cleaning day, bin reminders, weekly report day, monthly settlement day, and notification preferences.
            </p>
            <p className="mt-2 text-xs font-semibold text-muted-foreground">
              Saved: {Object.keys(setupSetting(state)).length ? "yes" : "not yet"}
            </p>
          </GlassCard>
          <GlassCard className="p-4">
            <SectionHeader title="Backup instructions" />
            <p className="text-sm leading-5 text-muted-foreground">
              Supabase is the source of truth. Before major resets, export data here or from Supabase Table Editor.
              Keep API keys only in Vercel environment variables.
            </p>
          </GlassCard>
        </TabsContent>
      </Tabs>
    </ScreenFrame>
  );
}

function TopBar({
  state,
  currentUser,
  onSwitchIdentity,
}: {
  state: HouseState;
  currentUser: HouseUser | null;
  onSwitchIdentity: () => void;
}) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <div className="sticky top-0 z-30 -mx-2 mb-3 border-b border-white/30 bg-background/75 px-2 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur-2xl dark:border-white/10">
      <div className="mx-auto flex w-full max-w-[440px] items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-2xl bg-gradient-to-br from-teal-500 via-amber-400 to-rose-500 text-white shadow-lg ring-1 ring-white/45"
            >
              <span className="text-[0.72rem] font-black leading-none tracking-normal">HF</span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-black">HouseFair AI</p>
              <p className="text-xs font-bold text-muted-foreground">
                {state.source === "seed" ? "Seed preview" : "Live database"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {currentUser ? (
            <Button size="icon" variant="glass" onClick={onSwitchIdentity} aria-label="Switch identity">
              <Avatar className="size-7">
                <AvatarFallback name={currentUser.name} gradient={currentUser.avatar_gradient} />
              </Avatar>
            </Button>
          ) : null}
          <Button
            size="icon"
            variant="glass"
            aria-label="Toggle theme"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          >
            <SunMoon className="size-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function BottomNav({ active, onChange }: { active: View; onChange: (view: View) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[440px] border-t border-white/30 bg-background/85 px-2 pb-[calc(env(safe-area-inset-bottom)+0.8rem)] pt-2 shadow-2xl backdrop-blur-2xl dark:border-white/10">
      <div className="grid grid-cols-5 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const selected = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              style={{ fontSize: "0.75rem" }}
              className={cn(
                "relative flex h-14 flex-col items-center justify-center gap-0.5 rounded-2xl font-bold leading-none text-muted-foreground transition",
                selected && "bg-primary text-primary-foreground shadow-lg shadow-primary/20",
              )}
            >
              <Icon className="size-5" />
              <span className="max-w-full whitespace-nowrap px-0">{item.shortLabel}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function HouseFairApp({ initialState }: { initialState: HouseState }) {
  const router = useRouter();
  const [state, setState] = React.useState(initialState);
  const [active, setActive] = React.useState<View>("today");
  const identitySnapshot = React.useSyncExternalStore(
    subscribeToIdentity,
    getIdentitySnapshot,
    getServerIdentitySnapshot,
  );
  const [identityOpen, setIdentityOpen] = React.useState(false);
  const [identityDismissed, setIdentityDismissed] = React.useState(false);
  const [dialog, setDialog] = React.useState<DialogName>(null);
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [selectedExpense, setSelectedExpense] = React.useState<Expense | null>(null);
  const [fabOpen, setFabOpen] = React.useState(false);
  const [pullStart, setPullStart] = React.useState<number | null>(null);
  const [pulling, setPulling] = React.useState(false);

  React.useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
    }
  }, []);

  const identityState = React.useMemo(
    () =>
      readJson<{
        identity: DeviceIdentity | null;
        session: DeviceSession | null;
      }>(identitySnapshot),
    [identitySnapshot],
  );
  const storedIdentity = React.useMemo(() => {
    const identity = identityState?.identity ?? null;
    if (!identity) return null;
    return {
      ...identity,
      personId: normalizePersonId(state.users, identity.personId) ?? identity.personId,
    };
  }, [identityState?.identity, state.users]);
  const storedSession = React.useMemo(() => {
    const session = identityState?.session ?? null;
    if (!session) return null;
    return {
      ...session,
      personId: normalizePersonId(state.users, session.personId) ?? session.personId,
    };
  }, [identityState?.session, state.users]);
  const activeSession = storedSession;
  const activeDeviceId = activeSession?.deviceId;
  const activeSessionToken = activeSession?.sessionToken;
  const currentUser =
    state.users.find((user) => user.id === activeSession?.personId) ?? null;

  React.useEffect(() => {
    if (!activeDeviceId || !activeSessionToken) return;

    const controller = new AbortController();
    const headers = new Headers();
    headers.set("Authorization", `Bearer ${activeSessionToken}`);
    headers.set("x-housefair-device-id", activeDeviceId);

    void fetch("/api/device/session", {
      method: "POST",
      headers,
      signal: controller.signal,
    })
      .then((response) => {
        if (response.status !== 401) return;
        clearStoredSession();
        setIdentityDismissed(false);
        setIdentityOpen(true);
        window.dispatchEvent(new Event(identityEvent));
      })
      .catch(() => {
        // Keep the local session during transient network failures.
      });

    return () => controller.abort();
  }, [activeDeviceId, activeSessionToken]);

  async function registerIdentity(personId: string, pin: string, taskStyle: TaskStylePreference) {
    try {
      const response = await fetch("/api/device/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId, pin, taskStyle }),
      });
      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error ?? "Could not create device identity.");
      }
      storeDeviceSession(await response.json());
      setIdentityDismissed(false);
      setIdentityOpen(false);
      toast.success("Device identity created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Device setup failed");
    }
  }

  async function verifyIdentity(pin: string) {
    if (!storedIdentity) return;

    try {
      const response = await fetch("/api/device/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-housefair-device-id": storedIdentity.deviceId,
        },
        body: JSON.stringify({ deviceId: storedIdentity.deviceId, pin }),
      });
      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error ?? "PIN verification failed.");
      }
      storeDeviceSession(await response.json());
      setIdentityDismissed(false);
      setIdentityOpen(false);
      toast.success("Welcome back");
    } catch (error) {
      const message = error instanceof Error ? error.message : "PIN verification failed";
      if (message.includes("Unknown device")) {
        clearDeviceSession();
        setIdentityDismissed(false);
        setIdentityOpen(true);
        toast.error("This saved device was reset. Create your identity again.");
        return;
      }
      toast.error(message);
    }
  }

  async function resetPin(currentPin: string, newPin: string) {
    if (!storedIdentity) return;

    try {
      const response = await fetch("/api/device/reset-pin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-housefair-device-id": storedIdentity.deviceId,
        },
        body: JSON.stringify({
          deviceId: storedIdentity.deviceId,
          currentPin,
          newPin,
        }),
      });
      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error ?? "PIN reset failed.");
      }
      storeDeviceSession(await response.json());
      setIdentityDismissed(false);
      setIdentityOpen(false);
      toast.success("PIN updated");
    } catch (error) {
      const message = error instanceof Error ? error.message : "PIN reset failed";
      if (message.includes("Unknown device")) {
        clearDeviceSession();
        setIdentityDismissed(false);
        setIdentityOpen(true);
        toast.error("This saved device was reset. Create your identity again.");
        return;
      }
      toast.error(message);
    }
  }

  const apiFetch = React.useCallback(async (
    endpoint: string,
    init: RequestInit,
    queue?: Omit<QueuedAction, "id" | "createdAt">,
  ) => {
    if (!activeSession) throw new Error("Confirm your PIN first.");

    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${activeSession.sessionToken}`);
    headers.set("x-housefair-device-id", activeSession.deviceId);

    if (queue && typeof navigator !== "undefined" && !navigator.onLine) {
      queueOfflineAction(queue);
      throw new Error("Saved offline. It will sync when the connection returns.");
    }

    try {
      const response = await fetch(endpoint, { ...init, headers });
      if (!response.ok && response.status === 401) {
        clearStoredSession();
        window.dispatchEvent(new Event(identityEvent));
      }
      return response;
    } catch (error) {
      if (queue) {
        queueOfflineAction(queue);
        throw new Error("Saved offline. It will sync when the connection returns.");
      }
      throw error;
    }
  }, [activeSession]);

  const flushQueuedActions = React.useCallback(async () => {
    if (!activeSession) return;
    const queued = readQueue();
    if (!queued.length) return;

    const remaining: QueuedAction[] = [];
    for (const action of queued) {
      try {
        await apiFetch(action.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(action.body),
        });
      } catch {
        remaining.push(action);
      }
    }

    writeQueue(remaining);
    if (remaining.length < queued.length) {
      toast.success(`${queued.length - remaining.length} offline action synced`);
      router.refresh();
    }
  }, [activeSession, apiFetch, router]);

  React.useEffect(() => {
    const onOnline = () => {
      void flushQueuedActions();
    };
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "HOUSEFAIR_SYNC_OFFLINE_ACTIONS") {
        void flushQueuedActions();
      }
    };
    window.addEventListener("online", onOnline);
    navigator.serviceWorker?.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("online", onOnline);
      navigator.serviceWorker?.removeEventListener("message", onMessage);
    };
  }, [flushQueuedActions]);

  function resetIdentity() {
    clearDeviceSession();
    setIdentityDismissed(false);
    setIdentityOpen(true);
  }

  function openComplete(task?: Task) {
    setSelectedTask(task ?? null);
    setDialog("complete");
  }

  function openMoneyExpense(expense?: Expense) {
    setSelectedExpense(expense ?? null);
    setDialog("money-expense");
  }

  function closeDialogs() {
    setDialog(null);
    setSelectedTask(null);
    setSelectedExpense(null);
  }

  function onTaskCompleted(task: Task, points: number) {
    setState((previous) => ({
      ...previous,
      tasks: previous.tasks.map((item) => (item.id === task.id ? task : item)),
      users: previous.users.map((user) =>
        user.id === task.completed_by
          ? { ...user, current_points: user.current_points + points, cleaning_streak: user.cleaning_streak + 1 }
          : user,
      ),
    }));
  }

  async function deferTask(task: Task) {
    const reason = window.prompt(
      `Why can't you do ${task.title} today?`,
      task.defer_reason ?? "Working late / not home today",
    );
    if (reason === null) return;

    const optimistic: Task = {
      ...task,
      status: "pending",
      deferral_count: (task.deferral_count ?? 0) + 1,
      deferred_by: currentUser?.id ?? task.deferred_by ?? null,
      deferred_at: new Date().toISOString(),
      defer_reason: reason.trim() || "Could not do it today.",
      next_reminder_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    setState((previous) => ({
      ...previous,
      tasks: previous.tasks.map((item) => (item.id === task.id ? optimistic : item)),
    }));

    try {
      const body = {
        taskId: task.id,
        reason: optimistic.defer_reason,
      };
      const response = await apiFetch("/api/tasks/defer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }, {
        endpoint: "/api/tasks/defer",
        body,
        label: `Carry over ${task.title}`,
      });
      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error ?? "Could not carry this task over.");
      }
      const result = (await response.json()) as { task: Task; push?: { sent: number; skipped?: boolean } };
      setState((previous) => ({
        ...previous,
        tasks: previous.tasks.map((item) => (item.id === task.id ? result.task : item)),
      }));
      navigator.vibrate?.(10);
      toast.success(
        result.push?.sent
          ? "Task carried over and push reminder sent"
          : "Task carried over and reminder saved",
      );
    } catch (error) {
      setState((previous) => ({
        ...previous,
        tasks: previous.tasks.map((item) => (item.id === task.id ? task : item)),
      }));
      toast.error(error instanceof Error ? error.message : "Carry-over failed");
    }
  }

  function openWhatsAppNudge(task: Task) {
    window.open(taskWhatsAppUrl(state, task), "_blank", "noopener,noreferrer");
  }

  async function updateGrocery(item: GroceryItem, status: GroceryStatus, price?: number | null) {
    if (!currentUser) return;
    const updated = {
      ...item,
      status,
      bought_by: status === "bought" ? currentUser?.id ?? item.bought_by : item.bought_by,
      added_by: item.added_by ?? currentUser?.id ?? null,
      price: price ?? item.price,
    };

    setState((previous) => ({
      ...previous,
      groceries: previous.groceries.map((grocery) =>
        grocery.id === item.id ? updated : grocery,
      ),
    }));

    try {
      const body = {
        id: item.id,
        name: item.name,
        category: item.category,
        status,
        price: price ?? item.price,
        notes: item.notes,
      };
      await apiFetch("/api/groceries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }, {
        endpoint: "/api/groceries",
        body,
        label: `Update ${item.name}`,
      });
      toast.success(`${item.name} marked ${statusLabels[status].toLowerCase()}`);
      if (status === "bought" && price && window.confirm(`Split ${item.name} ${formatCurrency(price)} with the house?`)) {
        const expenseResponse = await apiFetch("/api/money/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: item.name,
            amount: price,
            category: item.category === "Cleaning" || item.category === "Household" ? "Cleaning" : "Food",
            paid_by: currentUser.id,
            paid_date: new Date().toISOString().slice(0, 10),
            notes: `Added from grocery item: ${item.name}`,
            receipt_url: null,
            comments: "",
            split_type: "equal",
            splits: {},
          }),
        });
        if (expenseResponse.ok) {
          const result = (await expenseResponse.json()) as {
            expense: Expense;
            splits: ExpenseSplit[];
            comment?: MoneyComment | null;
            receipt?: MoneyReceipt | null;
          };
          addMoneyExpense(result);
          toast.success("Shared expense added");
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update grocery");
    }
  }

  async function toggleShopping(active: boolean) {
    if (!currentUser) return;

    const existing = state.shopping_sessions.find((session) => session.user_id === currentUser.id);
    const updated: ShoppingSession = {
      id: existing?.id ?? crypto.randomUUID(),
      user_id: currentUser.id,
      is_active: active,
      started_at: active ? (existing?.started_at ?? new Date().toISOString()) : existing?.started_at ?? null,
      ended_at: active ? null : new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_at: existing?.created_at ?? new Date().toISOString(),
    };

    setState((previous) => ({
      ...previous,
      shopping_sessions: [
        updated,
        ...previous.shopping_sessions.filter((session) => session.user_id !== currentUser.id),
      ],
    }));

    try {
      await apiFetch("/api/groceries/shopping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: active }),
      });
      toast.success(active ? "Shopping mode started" : "Shopping mode finished");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Shopping mode failed");
    }
  }

  function addGrocery(item: GroceryItem) {
    setState((previous) => ({
      ...previous,
      groceries: [item, ...previous.groceries.filter((existing) => existing.id !== item.id)],
    }));
  }

  function addComplaint(complaint: Complaint) {
    setState((previous) => ({
      ...previous,
      complaints: [complaint, ...previous.complaints],
    }));
  }

  function addAnnouncement(announcement: HouseAnnouncement) {
    setState((previous) => ({
      ...previous,
      house_announcements: [announcement, ...previous.house_announcements],
    }));
  }

  function addMoneyExpense(data: {
    expense: Expense;
    splits: ExpenseSplit[];
    comment?: MoneyComment | null;
    receipt?: MoneyReceipt | null;
  }) {
    setState((previous) => ({
      ...previous,
      expenses: [data.expense, ...previous.expenses.filter((item) => item.id !== data.expense.id)],
      expense_splits: [
        ...data.splits,
        ...previous.expense_splits.filter((item) => item.expense_id !== data.expense.id),
      ],
      money_comments: data.comment
        ? [data.comment, ...previous.money_comments]
        : previous.money_comments,
      receipts: data.receipt ? [data.receipt, ...previous.receipts] : previous.receipts,
    }));
  }

  function updateMoneyExpense(data: { expense: Expense; splits: ExpenseSplit[] }) {
    setState((previous) => ({
      ...previous,
      expenses: previous.expenses.map((item) =>
        item.id === data.expense.id ? data.expense : item,
      ),
      expense_splits: [
        ...data.splits,
        ...previous.expense_splits.filter((item) => item.expense_id !== data.expense.id),
      ],
    }));
  }

  function addSettlement(settlement: Settlement) {
    setState((previous) => ({
      ...previous,
      settlements: [settlement, ...previous.settlements],
    }));
  }

  function updateBudget(budget: Budget) {
    setState((previous) => ({
      ...previous,
      budgets: [budget, ...previous.budgets.filter((item) => item.category !== budget.category)],
    }));
  }

  async function deleteExpense(expense: Expense) {
    if (!window.confirm(`Delete ${expense.title}?`)) return;

    setState((previous) => ({
      ...previous,
      expenses: previous.expenses.map((item) =>
        item.id === expense.id ? { ...item, deleted_at: new Date().toISOString() } : item,
      ),
    }));

    try {
      const response = await apiFetch("/api/money/expenses", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expenseId: expense.id }),
      });
      if (!response.ok) throw new Error("Expense could not be deleted.");
      toast.success("Expense deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    }
  }

  async function addExpenseComment(expense: Expense) {
    const bodyText = window.prompt(`Comment on ${expense.title}`);
    if (!bodyText?.trim()) return;

    try {
      const response = await apiFetch("/api/money/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expense_id: expense.id, body: bodyText }),
      });
      if (!response.ok) throw new Error("Comment could not be saved.");
      const result = (await response.json()) as { comment: MoneyComment };
      setState((previous) => ({
        ...previous,
        money_comments: [result.comment, ...previous.money_comments],
      }));
      toast.success("Comment added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Comment failed");
    }
  }

  function updateGuestStatus(guest: GuestStatus) {
    setState((previous) => ({
      ...previous,
      guest_status: [
        guest,
        ...previous.guest_status.filter((item) => item.user_id !== guest.user_id),
      ],
    }));
  }

  function updateHouseSetting(setting: HouseState["house_settings"][number]) {
    setState((previous) => ({
      ...previous,
      house_settings: [
        setting,
        ...previous.house_settings.filter((item) => item.key !== setting.key),
      ],
    }));
  }

  async function voteComplaint(complaint: Complaint, supports: boolean) {
    if (!currentUser) return;

    setState((previous) => ({
      ...previous,
      complaints: previous.complaints.map((item) =>
        item.id === complaint.id
          ? {
              ...item,
              confirm_votes: supports ? item.confirm_votes + 1 : item.confirm_votes,
              reject_votes: supports ? item.reject_votes : item.reject_votes + 1,
              status:
                supports && item.confirm_votes + 1 >= 3
                  ? "confirmed"
                  : !supports && item.reject_votes + 1 >= 3
                    ? "rejected"
                    : "disputed",
            }
          : item,
      ),
    }));

    try {
      const body = {
        complaintId: complaint.id,
        supports_complaint: supports,
      };
      await apiFetch("/api/complaints/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }, {
        endpoint: "/api/complaints/vote",
        body,
        label: "Vote on complaint",
      });
      toast.success("Vote saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save vote");
    }
  }

  async function requestOrAcceptSwap(task: Task) {
    if (!currentUser) return;

    const existing = state.task_swaps.find(
      (swap) => swap.task_id === task.id && swap.status === "requested",
    );
    if (existing?.requested_by === currentUser.id) {
      toast("Your swap request is waiting for another housemate.");
      return;
    }
    const body = existing
      ? { action: "accept" as const, swapId: existing.id }
      : {
          action: "request" as const,
          taskId: task.id,
          reason: `${currentUser.name} requested a fair swap.`,
        };

    try {
      const response = await apiFetch("/api/tasks/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }, {
        endpoint: "/api/tasks/swap",
        body,
        label: existing ? "Accept task swap" : "Request task swap",
      });

      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error ?? "Swap failed.");
      }

      if (existing) {
        setState((previous) => ({
          ...previous,
          task_swaps: previous.task_swaps.map((swap) =>
            swap.id === existing.id
              ? { ...swap, status: "accepted", accepted_by: currentUser.id }
              : swap,
          ),
          tasks: previous.tasks.map((item) =>
            item.id === task.id ? { ...item, assigned_person: currentUser.id } : item,
          ),
        }));
        toast.success("Swap accepted");
      } else {
        const result = (await response.json()) as { swap: HouseState["task_swaps"][number] };
        setState((previous) => ({
          ...previous,
          task_swaps: [result.swap, ...previous.task_swaps],
        }));
        toast.success("Swap requested");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Swap failed");
    }
  }

  async function cancelSwap(swap: HouseState["task_swaps"][number]) {
    if (!currentUser) return;
    if (swap.requested_by !== currentUser.id) {
      toast.error("Only the requester can cancel this swap.");
      return;
    }

    const body = { action: "cancel" as const, swapId: swap.id };
    setState((previous) => ({
      ...previous,
      task_swaps: previous.task_swaps.map((item) =>
        item.id === swap.id ? { ...item, status: "cancelled", updated_at: new Date().toISOString() } : item,
      ),
    }));

    try {
      const response = await apiFetch("/api/tasks/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }, {
        endpoint: "/api/tasks/swap",
        body,
        label: "Cancel task swap",
      });

      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error ?? "Swap cancellation failed.");
      }

      toast.success("Swap cancelled");
    } catch (error) {
      setState((previous) => ({
        ...previous,
        task_swaps: previous.task_swaps.map((item) =>
          item.id === swap.id ? { ...item, status: "requested" } : item,
        ),
      }));
      toast.error(error instanceof Error ? error.message : "Swap cancellation failed");
    }
  }

  async function enablePush() {
    if (!currentUser) return;

    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        toast.error("Push notifications are not supported here");
        return;
      }

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        toast.error("VAPID public key is missing");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Notifications were not enabled");
        return;
      }

      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      await apiFetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: JSON.parse(JSON.stringify(subscription)),
        }),
      });

      toast.success("Push notifications enabled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Push setup failed");
    }
  }

  async function updateHouseMode(mode: HouseState["house_mode"]) {
    const previousMode = state.house_mode;
    const updatedAt = new Date().toISOString();
    const setting = { key: "house_mode", value: { mode }, updated_at: updatedAt };

    setState((previous) => ({
      ...previous,
      house_mode: mode,
      house_settings: [
        setting,
        ...previous.house_settings.filter((item) => item.key !== "house_mode"),
      ],
    }));

    try {
      const response = await apiFetch("/api/house/mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      if (!response.ok) throw new Error("House mode could not be updated.");
      const result = (await response.json()) as { setting?: HouseState["house_settings"][number] };
      if (result.setting) {
        setState((previous) => ({
          ...previous,
          house_mode: mode,
          house_settings: [
            result.setting!,
            ...previous.house_settings.filter((item) => item.key !== "house_mode"),
          ],
        }));
      }
      navigator.vibrate?.(12);
      toast.success(`House mode set to ${houseModeLabels[mode]}`);
    } catch (error) {
      setState((previous) => ({ ...previous, house_mode: previousMode }));
      toast.error(error instanceof Error ? error.message : "House mode failed");
    }
  }

  async function acceptHouseRules() {
    try {
      const response = await apiFetch("/api/house/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error("Rules agreement could not be saved.");
      const result = (await response.json()) as {
        acceptance: HouseState["house_rule_acceptances"][number];
      };
      setState((previous) => ({
        ...previous,
        house_rule_acceptances: [
          result.acceptance,
          ...previous.house_rule_acceptances.filter((item) => item.user_id !== result.acceptance.user_id),
        ],
      }));
      toast.success("House rules accepted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Rules agreement failed");
    }
  }

  async function generateWeeklyReport() {
    try {
      const response = await apiFetch("/api/ai/weekly-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error("Weekly report could not be generated.");
      const result = (await response.json()) as { report: WeeklyReport };
      setState((previous) => ({
        ...previous,
        weekly_reports: [
          result.report,
          ...previous.weekly_reports.filter((item) => item.week_start !== result.report.week_start),
        ],
      }));
      toast.success("Weekly report ready");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Weekly report failed");
    }
  }

  function downloadJson(filename: string, payload: unknown) {
    downloadBlob(filename, JSON.stringify(payload, null, 2), "application/json");
  }

  async function runMaintenance(
    action: "export_data" | "export_csv" | "export_pdf" | "reset_points" | "reset_test_data" | "audit_logs",
  ) {
    const pin = window.prompt("Maintenance PIN");
    if (!pin) return;

    try {
      const apiAction = action === "export_csv" || action === "export_pdf" ? "export_data" : action;
      const response = await apiFetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, action: apiAction }),
      });
      const result = (await response.json()) as {
        state?: HouseState;
        logs?: unknown[];
        error?: string;
      };
      if (!response.ok) throw new Error(result.error ?? "Maintenance action failed.");

      const backupKey = `${dateKey(new Date())}-${new Date().toTimeString().slice(0, 5).replace(":", "")}`;
      if (action === "export_data" && result.state) {
        downloadJson(`housefair-export-${backupKey}.json`, result.state);
      }
      if (action === "export_csv" && result.state) {
        downloadBlob(`housefair-export-${backupKey}.csv`, stateToCsv(result.state), "text/csv");
      }
      if (action === "export_pdf" && result.state) {
        downloadBlob(`housefair-backup-${backupKey}.pdf`, exportPdfSummary(result.state), "application/pdf");
      }
      if (action === "audit_logs" && result.logs) {
        downloadJson(`housefair-audit-${backupKey}.json`, result.logs);
      }
      if (action === "reset_points") {
        setState((previous) => ({
          ...previous,
          users: previous.users.map((user) => ({ ...user, current_points: 0, cleaning_streak: 0 })),
          points_ledger: [],
          task_history: [],
          rewards: [],
        }));
      }
      if (action === "reset_test_data") {
        clearDeviceSession();
        setIdentityDismissed(false);
        setIdentityOpen(true);
        router.refresh();
      }
      toast.success("Maintenance action complete");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Maintenance failed");
    }
  }

  function startPull(event: React.TouchEvent<HTMLDivElement>) {
    if (window.scrollY <= 0) setPullStart(event.touches[0].clientY);
  }

  function movePull(event: React.TouchEvent<HTMLDivElement>) {
    if (pullStart === null) return;
    const distance = event.touches[0].clientY - pullStart;
    setPulling(distance > 80);
  }

  function endPull() {
    if (pulling) {
      toast("Refreshing house data");
      router.refresh();
    }
    setPullStart(null);
    setPulling(false);
  }

  return (
    <div
      className="mx-auto min-h-[100svh] w-full max-w-[440px] overflow-x-hidden px-2 pb-[calc(env(safe-area-inset-bottom)+6rem)]"
      onTouchStart={startPull}
      onTouchMove={movePull}
      onTouchEnd={endPull}
    >
      <TopBar
        state={state}
        currentUser={currentUser}
        onSwitchIdentity={() => {
          setIdentityDismissed(false);
          setIdentityOpen(true);
        }}
      />

      {pulling ? (
        <div className="fixed left-1/2 top-16 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border bg-background/90 px-4 py-2 text-sm font-bold shadow-xl backdrop-blur">
          <RefreshCcw className="size-4 animate-spin" />
          Release to refresh
        </div>
      ) : null}

      <main className="mx-auto w-full">
        {currentUser && activeSession ? (
          <AnimatePresence mode="wait">
            <div key={active}>
              {active === "today" ? (
                <TodayScreen
                  state={state}
                  currentUser={currentUser}
                  onOpenDialog={(next) => {
                    if (next === "complete") openComplete();
                    else setDialog(next);
                  }}
                  onNavigate={setActive}
                  onAddExpense={() => openMoneyExpense()}
                  onDefer={deferTask}
                  onWhatsApp={openWhatsAppNudge}
                />
              ) : null}
              {active === "tasks" ? (
                <TasksScreen
                  state={state}
                  currentUser={currentUser}
                  onComplete={openComplete}
                  onDefer={deferTask}
                  onWhatsApp={openWhatsAppNudge}
                  onSwap={requestOrAcceptSwap}
                  onCancelSwap={cancelSwap}
                />
              ) : null}
              {active === "groceries" ? (
                <GroceriesScreen
                  state={state}
                  currentUser={currentUser}
                  onOpenAdd={() => setDialog("grocery")}
                  onOpenScan={() => setDialog("barcode")}
                  onUpdate={updateGrocery}
                  onToggleShopping={toggleShopping}
                />
              ) : null}
              {active === "money" ? (
                <MoneyScreen
                  state={state}
                  currentUser={currentUser}
                  onOpenExpense={() => openMoneyExpense()}
                  onOpenSettlement={() => setDialog("money-settlement")}
                  onOpenBudget={() => setDialog("money-budget")}
                  onEditExpense={openMoneyExpense}
                  onDeleteExpense={deleteExpense}
                  onAddComment={addExpenseComment}
                />
              ) : null}
              {active === "more" ? (
                <MoreScreen
                  state={state}
                  currentUser={currentUser}
                  apiFetch={apiFetch}
                  onSwitchIdentity={() => {
                    setIdentityDismissed(false);
                    setIdentityOpen(true);
                  }}
                  onEnablePush={enablePush}
                  onVote={voteComplaint}
                  onOpenAnnouncement={() => setDialog("announcement")}
                  onOpenGuests={() => setDialog("guests")}
                  onOpenSetup={() => setDialog("setup")}
                  onHouseMode={updateHouseMode}
                  onAcceptRules={acceptHouseRules}
                  onWeeklyReport={generateWeeklyReport}
                  onMaintenance={runMaintenance}
                />
              ) : null}
            </div>
          </AnimatePresence>
        ) : (
          <div className="grid min-h-[70vh] place-items-center">
            <GlassCard className="p-6 text-center">
              <ShieldCheck className="mx-auto size-8 text-primary" />
              <p className="mt-3 text-lg font-black">House PIN required</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Create or confirm your device identity to open today&apos;s house view.
              </p>
              <Button
                className="mt-4 w-full"
                variant="premium"
                onClick={() => {
                  setIdentityDismissed(false);
                  setIdentityOpen(true);
                }}
              >
                Open identity setup
              </Button>
            </GlassCard>
          </div>
        )}
      </main>

      {currentUser && activeSession ? (
        <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.8rem)] right-4 z-50 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2 sm:right-[calc((100vw-440px)/2+1rem)]">
          <AnimatePresence>
            {fabOpen ? (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                className="grid w-52 gap-2 rounded-3xl border border-white/40 bg-background/90 p-2 shadow-2xl backdrop-blur-2xl dark:border-white/10"
              >
                {[
                  { label: "Complete task", icon: Check, action: () => openComplete() },
                  { label: "Add expense", icon: Euro, action: () => openMoneyExpense() },
                  { label: "Add grocery", icon: ShoppingBasket, action: () => setDialog("grocery") },
                  { label: "Report issue", icon: AlertTriangle, action: () => setDialog("complaint") },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <Button
                      key={item.label}
                      className="justify-start"
                      variant="ghost"
                      onClick={() => {
                        setFabOpen(false);
                        item.action();
                      }}
                    >
                      <Icon className="size-4" />
                      {item.label}
                    </Button>
                  );
                })}
              </motion.div>
            ) : null}
          </AnimatePresence>
          <Button
            size="icon"
            variant="premium"
            className={cn("size-14 rounded-full shadow-2xl transition", fabOpen && "rotate-45")}
            aria-label="Quick actions"
            aria-expanded={fabOpen}
            onClick={() => setFabOpen((open) => !open)}
          >
            <Plus className="size-6" />
          </Button>
        </div>
      ) : null}

      <BottomNav active={active} onChange={setActive} />

      <IdentityDialog
        key={storedIdentity?.deviceId ?? "new-device"}
        open={identityOpen || (!activeSession && !identityDismissed)}
        users={state.users}
        storedIdentity={storedIdentity}
        onRegister={registerIdentity}
        onVerify={verifyIdentity}
        onResetPin={resetPin}
        onReset={resetIdentity}
        onDismiss={() => {
          setIdentityOpen(false);
          setIdentityDismissed(true);
        }}
      />
      {currentUser && activeSession ? (
        <>
          <CompleteTaskDialog
            key={`${dialog}-${selectedTask?.id ?? "none"}`}
            open={dialog === "complete"}
            state={state}
            session={activeSession}
            apiFetch={apiFetch}
            selectedTask={selectedTask}
            onClose={closeDialogs}
            onCompleted={onTaskCompleted}
          />
          <ComplaintDialog
            open={dialog === "complaint"}
            state={state}
            currentUser={currentUser}
            session={activeSession}
            apiFetch={apiFetch}
            onClose={closeDialogs}
            onCreated={addComplaint}
          />
          <GroceryDialog
            open={dialog === "grocery"}
            apiFetch={apiFetch}
            onClose={closeDialogs}
            onCreated={addGrocery}
          />
          <BarcodeDialog
            open={dialog === "barcode"}
            apiFetch={apiFetch}
            onClose={closeDialogs}
            onCreated={addGrocery}
          />
          <AnnouncementDialog
            open={dialog === "announcement"}
            apiFetch={apiFetch}
            onClose={closeDialogs}
            onCreated={addAnnouncement}
          />
          <GuestDialog
            open={dialog === "guests"}
            currentGuest={
              state.guest_status.find((item) => item.user_id === currentUser.id) ?? null
            }
            apiFetch={apiFetch}
            onClose={closeDialogs}
            onUpdated={updateGuestStatus}
          />
          <FirstWeekSetupDialog
            open={dialog === "setup"}
            state={state}
            apiFetch={apiFetch}
            onClose={closeDialogs}
            onSaved={updateHouseSetting}
          />
          <MoneyExpenseDialog
            key={`${dialog === "money-expense" ? "open" : "closed"}-${selectedExpense?.id ?? "new"}`}
            open={dialog === "money-expense"}
            state={state}
            currentUser={currentUser}
            session={activeSession}
            editingExpense={selectedExpense}
            apiFetch={apiFetch}
            onClose={closeDialogs}
            onCreated={addMoneyExpense}
            onUpdated={updateMoneyExpense}
          />
          <SettlementDialog
            open={dialog === "money-settlement"}
            state={state}
            currentUser={currentUser}
            apiFetch={apiFetch}
            onClose={closeDialogs}
            onCreated={addSettlement}
          />
          <BudgetDialog
            open={dialog === "money-budget"}
            apiFetch={apiFetch}
            onClose={closeDialogs}
            onUpdated={updateBudget}
          />
        </>
      ) : null}
    </div>
  );
}
