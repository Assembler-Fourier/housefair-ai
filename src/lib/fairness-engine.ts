import { addDays, format } from "date-fns";
import type {
  CleanlinessScore,
  GroceryPrediction,
  HouseState,
  HouseUser,
  Task,
  TaskDifficulty,
  WeeklyAssignment,
  WeeklyPlan,
} from "@/lib/types";
import { clamp } from "@/lib/utils";

const weeklyTemplates: Array<{
  task_title: string;
  location: string;
  difficulty: TaskDifficulty;
  points: number;
  dueOffset: number;
}> = [
  {
    task_title: "Kitchen deep clean",
    location: "Kitchen",
    difficulty: "heavy",
    points: 8,
    dueOffset: 1,
  },
  {
    task_title: "Vacuum and mop ground floor",
    location: "Ground floor",
    difficulty: "heavy",
    points: 8,
    dueOffset: 2,
  },
  {
    task_title: "Clean ground floor bathroom",
    location: "Ground floor bathroom",
    difficulty: "heavy",
    points: 7,
    dueOffset: 3,
  },
  {
    task_title: "Clean top floor bathroom",
    location: "Top floor bathroom",
    difficulty: "heavy",
    points: 8,
    dueOffset: 4,
  },
  {
    task_title: "Clean stairs",
    location: "Stairs",
    difficulty: "medium",
    points: 4,
    dueOffset: 4,
  },
  {
    task_title: "Clean hallway",
    location: "Hallway",
    difficulty: "medium",
    points: 4,
    dueOffset: 5,
  },
];

function pointsForUser(state: HouseState, userId: string) {
  const base = state.users.find((user) => user.id === userId)?.current_points ?? 0;
  return state.points_ledger
    .filter((entry) => entry.user_id === userId)
    .reduce((total, entry) => total + entry.points_delta, base);
}

function daysAgo(value: string) {
  return (Date.now() - new Date(value).getTime()) / (1000 * 60 * 60 * 24);
}

function heavyTaskLoad(state: HouseState, userId: string) {
  return state.task_history
    .filter((history) => history.completed_by === userId && history.difficulty === "heavy")
    .reduce((total, history) => {
      const age = daysAgo(history.completed_at);
      if (age <= 14) return total + 3;
      if (age <= 35) return total + 1.4;
      return total + 0.4;
    }, 0);
}

function completedWorkload(state: HouseState, userId: string) {
  return state.task_history
    .filter((history) => history.completed_by === userId)
    .reduce((total, history) => {
      const age = daysAgo(history.completed_at);
      const recency = age <= 7 ? 1.5 : age <= 28 ? 1 : 0.35;
      const difficultyWeight =
        history.difficulty === "heavy" ? 1.5 : history.difficulty === "medium" ? 1.15 : 1;
      return total + history.points_awarded * recency * difficultyWeight;
    }, 0);
}

function recentTaskPenalty(state: HouseState, user: HouseUser, taskTitle: string) {
  const relatedTasks = state.tasks.filter((task) => task.title === taskTitle);
  const relatedIds = new Set(relatedTasks.map((task) => task.id));

  const recent = state.task_history.find(
    (history) =>
      history.completed_by === user.id &&
      (relatedIds.has(history.task_id) ||
        state.tasks.find((task) => task.id === history.task_id)?.title === taskTitle),
  );

  if (!recent) return 0;
  const age = daysAgo(recent.completed_at);
  if (age <= 14) return 24;
  if (age <= 35) return 12;
  return 4;
}

function complaintLoad(state: HouseState, userId: string) {
  return state.complaints
    .filter((complaint) => complaint.person_involved === userId)
    .reduce((total, complaint) => {
      const age = daysAgo(complaint.created_at);
      const recency = age <= 14 ? 1.4 : age <= 45 ? 0.8 : 0.25;
      const severity =
        complaint.status === "confirmed" || complaint.status === "resolved"
          ? 6
          : complaint.status === "open" || complaint.status === "disputed"
            ? 3
            : 0;
      return total + severity * recency;
    }, 0);
}

function helpingCredit(state: HouseState, userId: string) {
  return state.task_swaps.filter(
    (swap) => swap.accepted_by === userId && swap.status === "accepted",
  ).length * 5;
}

function moneyContribution(state: HouseState, userId: string) {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return state.expenses
    .filter((expense) => !expense.deleted_at)
    .filter((expense) => expense.paid_by === userId)
    .filter((expense) => {
      const value = expense.paid_date;
      const key = /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? value
        : new Date(value).toISOString().slice(0, 10);
      return key.startsWith(currentMonth);
    })
    .reduce((total, expense) => total + Number(expense.amount ?? 0), 0);
}

function guestLoad(state: HouseState, userId: string, location: string) {
  const status = state.guest_status.find((item) => item.user_id === userId);
  if (!status?.guest_staying) return 0;
  const sharedAreaMultiplier =
    location.toLowerCase().includes("bathroom") ||
    location.toLowerCase().includes("kitchen") ||
    location.toLowerCase().includes("trash")
      ? 2.5
      : 1;
  return status.guest_count * sharedAreaMultiplier;
}

function availabilityPenalty(state: HouseState, user: HouseUser, dueOffset: number) {
  const day = addDays(new Date(), dueOffset).getDay();
  const preference = state.availability.find(
    (entry) => entry.user_id === user.id && entry.day_of_week === day,
  );
  if (!preference) return 0;
  return preference.unavailable ? 24 : preference.preferred_window === "Evening" ? 0 : 3;
}

function stylePenalty(state: HouseState, user: HouseUser, task: (typeof weeklyTemplates)[number]) {
  const preference = state.user_preferences.find((item) => item.user_id === user.id)?.task_style;
  if (!preference) return 0;

  const dueDay = addDays(new Date(), task.dueOffset).getDay();
  if (preference === "heavy") return task.difficulty === "heavy" ? -8 : 2;
  if (preference === "light") return task.difficulty === "heavy" ? 12 : -4;
  if (preference === "weekend") return dueDay === 0 || dueDay === 6 ? -8 : 5;
  if (preference === "evening") return dueDay >= 1 && dueDay <= 5 ? -2 : 1;
  return 0;
}

function houseModePenalty(state: HouseState, task: (typeof weeklyTemplates)[number]) {
  if (state.house_mode === "normal") return 0;
  const location = `${task.location} ${task.task_title}`.toLowerCase();
  if (state.house_mode === "guests_coming") {
    return location.includes("bathroom") || location.includes("kitchen") || location.includes("ground")
      ? -10
      : 2;
  }
  if (state.house_mode === "deep_clean_week") return task.difficulty === "heavy" ? -8 : 0;
  if (state.house_mode === "party_mode") {
    return location.includes("trash") || location.includes("bin") || location.includes("kitchen") ? -8 : 1;
  }
  return 0;
}

function excludedNamesForLocation(state: HouseState, location: string) {
  return state.areas.find((area) => area.name === location)?.excluded_members ?? [];
}

function isEligible(state: HouseState, user: HouseUser, location: string) {
  return !excludedNamesForLocation(state, location).includes(user.name);
}

function chooseAssignee(
  state: HouseState,
  task: (typeof weeklyTemplates)[number],
  reserved: Set<string>,
) {
  const scored = state.users
    .filter((user) => isEligible(state, user, task.location))
    .map((user) => {
      const points = pointsForUser(state, user.id);
      const heavyLoad = heavyTaskLoad(state, user.id);
      const recentWorkload = completedWorkload(state, user.id);
      const complaints = complaintLoad(state, user.id);
      const help = helpingCredit(state, user.id);
      const moneyPaid = moneyContribution(state, user.id);
      const guestAdjustment = guestLoad(state, user.id, task.location);
      const loadPenalty = reserved.has(user.id) ? 14 : 0;
      const score =
        points +
        heavyLoad * 9 +
        recentWorkload * 0.18 +
        complaints * 0.9 -
        help +
        Math.max(-8, -moneyPaid * 0.035) +
        guestAdjustment +
        recentTaskPenalty(state, user, task.task_title) +
        availabilityPenalty(state, user, task.dueOffset) +
        stylePenalty(state, user, task) +
        houseModePenalty(state, task) +
        loadPenalty;

      return { user, score, points, heavyLoad, recentWorkload, complaints, moneyPaid };
    })
    .sort((a, b) => a.score - b.score);

  return scored[0];
}

function deriveCleanlinessScores(state: HouseState): CleanlinessScore[] {
  const openComplaints = state.complaints.filter((item) =>
    ["open", "denied", "disputed"].includes(item.status),
  );
  const overdue = state.tasks.filter((task) => task.status === "overdue").length;
  const recentlyCompleted = state.task_history.filter((history) => daysAgo(history.completed_at) <= 7)
    .length;
  const kitchenIssues = openComplaints.filter((item) => item.location === "Kitchen").length;
  const bathroomIssues = openComplaints.filter((item) =>
    item.location.toLowerCase().includes("bathroom"),
  ).length;
  const trashIssues = openComplaints.filter((item) =>
    item.category.toLowerCase().includes("trash"),
  ).length;

  const kitchen = clamp(86 + recentlyCompleted * 0.25 - kitchenIssues * 9 - overdue * 2, 48, 96);
  const bathrooms = clamp(78 + recentlyCompleted * 0.18 - bathroomIssues * 12 - overdue * 3, 42, 94);
  const trash = clamp(92 - trashIssues * 14, 50, 98);
  const overall = Math.round((kitchen + bathrooms + trash) / 3);

  return [
    { label: "Kitchen", score: kitchen, trend: kitchen >= 82 ? "up" : "flat" },
    { label: "Bathrooms", score: bathrooms, trend: bathrooms >= 75 ? "flat" : "down" },
    { label: "Trash", score: trash, trend: trash >= 86 ? "up" : "flat" },
    { label: "Overall", score: overall, trend: overall >= 80 ? "up" : "flat" },
  ];
}

function predictGroceries(state: HouseState): GroceryPrediction[] {
  const urgent = state.groceries
    .filter((item) => ["running_low", "needed"].includes(item.status))
    .slice(0, 4)
    .map((item, index) => ({
      item: item.name,
      confidence: [91, 87, 82, 78][index] ?? 74,
      reason:
        item.status === "needed"
          ? `${item.name} is already marked needed.`
          : `${item.name} is running low and should be checked before the next shop.`,
      suggested_status: "needed" as const,
    }));

  if (!urgent.find((item) => item.item === "Milk")) {
    urgent.unshift({
      item: "Milk",
      confidence: 84,
      reason: "Milk often repeats every few days in a six-person house.",
      suggested_status: "needed",
    });
  }

  return urgent.slice(0, 5);
}

function workloadSummary(state: HouseState) {
  return state.users
    .map((user) => ({
      user,
      points: pointsForUser(state, user.id),
      heavyLoad: heavyTaskLoad(state, user.id),
      complaints: complaintLoad(state, user.id),
      recentWorkload: completedWorkload(state, user.id),
    }))
    .sort((a, b) => a.points - b.points);
}

export function generateFairWeeklyPlan(state: HouseState): WeeklyPlan {
  const reserved = new Set<string>();
  const assignments: WeeklyAssignment[] = [];
  const summary = workloadSummary(state);
  const templates =
    state.house_mode === "deep_clean_week"
      ? [
          ...weeklyTemplates,
          {
            task_title: "Deep cleaning rotation",
            location: "Shared areas",
            difficulty: "heavy" as const,
            points: 8,
            dueOffset: 6,
          },
        ]
      : state.house_mode === "party_mode"
        ? weeklyTemplates.map((item) =>
            item.task_title.includes("Kitchen") || item.location.includes("Ground")
              ? { ...item, dueOffset: Math.min(item.dueOffset, 2) }
              : item,
          )
        : state.house_mode === "guests_coming"
          ? weeklyTemplates.map((item) =>
              item.location.includes("bathroom") || item.location.includes("Kitchen")
                ? { ...item, dueOffset: Math.min(item.dueOffset, 2) }
                : item,
            )
          : weeklyTemplates;

  for (const template of templates) {
    const choice = chooseAssignee(state, template, reserved);
    if (!choice) continue;
    reserved.add(choice.user.id);
    const excludedNames = excludedNamesForLocation(state, template.location);

    assignments.push({
      task_title: template.task_title,
      location: template.location,
      assigned_to: choice.user.id,
      reason:
        excludedNames.length > 0
          ? `${choice.user.name} is eligible for ${template.location}; excluded members are ${excludedNames.join(", ")}. Heavy-load score is ${choice.heavyLoad.toFixed(1)}, recent workload is ${Math.round(choice.recentWorkload)}, and this keeps rotation balanced.`
          : `${choice.user.name} has the lowest fair score after points (${choice.points}), heavy-load history (${choice.heavyLoad.toFixed(1)}), recent workload (${Math.round(choice.recentWorkload)}), complaints signal (${choice.complaints.toFixed(1)}), availability, preferences, and this month's money contribution (EUR ${choice.moneyPaid.toFixed(2)}).`,
      difficulty: template.difficulty,
      points: template.points,
      due_day: format(addDays(new Date(), template.dueOffset), "EEEE"),
    });
  }

  const heavyAssignments = assignments.filter((item) => item.difficulty === "heavy");
  const cleanliness_scores = deriveCleanlinessScores(state);
  const grocery_predictions = predictGroceries(state);
  const lowestLoad = summary[0];
  const highestLoad = summary[summary.length - 1];
  const hasHistory =
    state.task_history.length > 0 ||
    state.points_ledger.length > 0 ||
    state.complaints.length > 0 ||
    state.rewards.length > 0;
  const totalGuests = state.guest_status.reduce(
    (total, item) => total + (item.guest_staying ? item.guest_count : 0),
    0,
  );
  const ruleNotes = state.areas
    .filter((area) => area.excluded_members.length > 0)
    .map(
      (area) =>
        `${area.name} excludes ${area.excluded_members.join(", ")} from assignment.`,
    );

  return {
    title: "HouseFair AI Manager weekly plan",
    generated_at: new Date().toISOString(),
    summary:
      `Balanced draft plan for ${state.house_mode.replaceAll("_", " ")} using points, recent heavy work, complaints, availability, task style preferences, money contribution, and bathroom rules.`,
    house_mode: state.house_mode,
    assignments,
    fairness_notes: [
      ...(ruleNotes.length ? ruleNotes : ["No area-specific exclusions are configured."]),
      `${heavyAssignments.length} heavy tasks are spread across eligible housemates.`,
      hasHistory
        ? "Recent heavy tasks count more than older history so nobody gets stuck with the same hard work."
        : "No real house history exists yet, so this draft uses room rules, eligibility, task difficulty, and current assignments only.",
      "Open or resolved complaints are context signals, not automatic punishment.",
      "Money contribution is a gentle context signal only; it does not replace cleaning responsibility.",
      totalGuests > 0
        ? `${totalGuests} guest${totalGuests === 1 ? "" : "s"} are marked as staying, so kitchen, bathroom, and trash load is weighted carefully.`
        : "No guests are currently marked as staying.",
      lowestLoad && highestLoad
        ? `${lowestLoad.user.name} currently has the lightest points load; ${highestLoad.user.name} has the highest points load.`
        : "The manager could not compare point loads yet.",
      "This is a draft plan until the house reviews it.",
      `House mode is ${state.house_mode.replaceAll("_", " ")}, so recommendations are weighted for that context.`,
    ],
    reminders: [
      "Thursday 8 PM: put bins outside.",
      "Daily kitchen reset before midnight.",
      "Dish duty covers shared cooking and tea mess; everyone still washes their own personal dishes.",
      "Heavy tasks should include before and after proof.",
    ],
    grocery_predictions,
    cleanliness_scores,
    fairness_report: `House balance is ${state.stats.house_balance_score}%. The model reviewed ${state.task_history.length} completed task records, ${state.complaints.length} house issues, ${state.availability.length} availability preferences, ${state.groceries.length} grocery states, and ${totalGuests} current guests. Heavy work is spread across ${new Set(heavyAssignments.map((item) => item.assigned_to)).size} people, with top-floor bathroom rules enforced.`,
    cleaning_recommendations: [
      "Keep kitchen surfaces clear before midnight to protect the daily cleanliness score.",
      "Treat personal dishes as personal responsibility; assign points only for shared dish duty.",
      "Require before and after photos for bathroom and deep kitchen work.",
      "Use swaps early when someone knows they are unavailable.",
      "Review open complaints calmly before using them as fairness context.",
    ],
  };
}

export function createProofRecommendation(input: {
  task?: Task;
  beforeUrl?: string | null;
  afterUrl?: string | null;
  area?: string | null;
}) {
  const needsProof = input.task?.proof_required ?? true;
  const hasBoth = Boolean(input.beforeUrl && input.afterUrl);
  const areaLooksRight =
    !input.area ||
    !input.task ||
    input.task.location.toLowerCase().includes(input.area.toLowerCase()) ||
    input.area.toLowerCase().includes(input.task.location.toLowerCase().split(" ")[0]);

  if (!needsProof) {
    return {
      status: "accepted" as const,
      feedback: "Proof accepted",
      confidence: 78,
      cleanlinessImprovementScore: 70,
      recommendation: "No proof required for this task.",
    };
  }

  if (!hasBoth) {
    return {
      status: "needs_clearer_proof" as const,
      feedback: "Please upload clearer proof",
      confidence: 61,
      cleanlinessImprovementScore: 0,
      recommendation: "Upload both before and after photos from the same area.",
    };
  }

  if (!areaLooksRight) {
    return {
      status: "needs_clearer_proof" as const,
      feedback: "Please upload clearer proof",
      confidence: 58,
      cleanlinessImprovementScore: 25,
      recommendation: "The area does not clearly match the task location.",
    };
  }

  return {
    status: "accepted" as const,
    feedback: "Proof accepted",
    confidence: 86,
    cleanlinessImprovementScore: 82,
    recommendation: "Proof looks valid. Keep the same angle for stronger comparison next time.",
  };
}
