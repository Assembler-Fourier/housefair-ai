import { addDays, formatISO, subDays } from "date-fns";
import type {
  AIRecommendation,
  Area,
  AvailabilityPreference,
  Budget,
  CleanlinessScore,
  Complaint,
  ComplaintVote,
  Expense,
  ExpenseSplit,
  GroceryItem,
  GuestStatus,
  HouseAnnouncement,
  HouseNotification,
  HouseState,
  HouseStats,
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
  UserDevice,
} from "@/lib/types";
import { clamp } from "@/lib/utils";

const today = new Date();
const iso = (date: Date) => formatISO(date, { representation: "date" });

export const rooms: Room[] = [
  {
    id: "00000000-0000-4000-8000-000000000201",
    name: "Alex-Blair Room",
    floor: "top",
    capacity: 2,
    privacy_level: "shared",
  },
  {
    id: "00000000-0000-4000-8000-000000000202",
    name: "Casey-Devin-Ellis Room",
    floor: "top",
    capacity: 3,
    privacy_level: "shared",
  },
  {
    id: "00000000-0000-4000-8000-000000000203",
    name: "Finley Room",
    floor: "top",
    capacity: 1,
    privacy_level: "single",
  },
];

export const users: HouseUser[] = [
  {
    id: "00000000-0000-4000-8000-000000000101",
    name: "Alex",
    room_id: "00000000-0000-4000-8000-000000000201",
    room_name: "Alex-Blair Room",
    avatar_gradient: "from-emerald-400 via-teal-500 to-sky-500",
    current_points: 34,
    cleaning_streak: 5,
    created_at: iso(subDays(today, 50)),
  },
  {
    id: "00000000-0000-4000-8000-000000000102",
    name: "Blair",
    room_id: "00000000-0000-4000-8000-000000000201",
    room_name: "Alex-Blair Room",
    avatar_gradient: "from-amber-300 via-orange-500 to-rose-500",
    current_points: 28,
    cleaning_streak: 2,
    created_at: iso(subDays(today, 50)),
  },
  {
    id: "00000000-0000-4000-8000-000000000103",
    name: "Casey",
    room_id: "00000000-0000-4000-8000-000000000202",
    room_name: "Casey-Devin-Ellis Room",
    avatar_gradient: "from-cyan-400 via-blue-500 to-indigo-500",
    current_points: 31,
    cleaning_streak: 4,
    created_at: iso(subDays(today, 50)),
  },
  {
    id: "00000000-0000-4000-8000-000000000104",
    name: "Devin",
    room_id: "00000000-0000-4000-8000-000000000202",
    room_name: "Casey-Devin-Ellis Room",
    avatar_gradient: "from-lime-300 via-green-500 to-emerald-600",
    current_points: 23,
    cleaning_streak: 1,
    created_at: iso(subDays(today, 50)),
  },
  {
    id: "00000000-0000-4000-8000-000000000105",
    name: "Ellis",
    room_id: "00000000-0000-4000-8000-000000000202",
    room_name: "Casey-Devin-Ellis Room",
    avatar_gradient: "from-fuchsia-400 via-rose-500 to-red-500",
    current_points: 26,
    cleaning_streak: 3,
    created_at: iso(subDays(today, 50)),
  },
  {
    id: "00000000-0000-4000-8000-000000000106",
    name: "Finley",
    room_id: "00000000-0000-4000-8000-000000000203",
    room_name: "Finley Room",
    avatar_gradient: "from-stone-300 via-zinc-500 to-neutral-800",
    current_points: 37,
    cleaning_streak: 6,
    created_at: iso(subDays(today, 50)),
  },
];

export const areas: Area[] = [
  {
    id: "area-tv-main-room",
    name: "TV/main room",
    floor: "ground",
    description: "Shared sitting space and guest area.",
    everyone_uses: true,
    excluded_members: [],
  },
  {
    id: "area-kitchen",
    name: "Kitchen",
    floor: "ground",
    description: "Food prep, shelves, sink, and shared counters.",
    everyone_uses: true,
    excluded_members: [],
  },
  {
    id: "area-ground-bathroom",
    name: "Ground floor bathroom",
    floor: "ground",
    description: "Used by everyone and guests.",
    everyone_uses: true,
    excluded_members: [],
  },
  {
    id: "area-washing-machine",
    name: "Washing machine area",
    floor: "ground",
    description: "Laundry and cleaning supply zone.",
    everyone_uses: true,
    excluded_members: [],
  },
  {
    id: "area-stairs",
    name: "Stairs",
    floor: "ground",
    description: "Shared access between floors.",
    everyone_uses: true,
    excluded_members: [],
  },
  {
    id: "area-hallway",
    name: "Hallway",
    floor: "top",
    description: "Top floor shared passage.",
    everyone_uses: true,
    excluded_members: [],
  },
  {
    id: "area-top-bathroom",
    name: "Top floor bathroom",
    floor: "top",
    description: "Shared bathroom used by everyone except Blair.",
    everyone_uses: false,
    excluded_members: ["Blair"],
  },
  {
    id: "area-2-person-bedroom",
    name: "Alex-Blair Room",
    floor: "top",
    description: "Private room responsibility for Alex and Blair.",
    everyone_uses: false,
    excluded_members: ["Casey", "Devin", "Ellis", "Finley"],
  },
  {
    id: "area-3-person-bedroom",
    name: "Casey-Devin-Ellis Room",
    floor: "top",
    description: "Private room responsibility for Casey, Devin, and Ellis.",
    everyone_uses: false,
    excluded_members: ["Alex", "Blair", "Finley"],
  },
  {
    id: "area-single-bedroom",
    name: "Finley Room",
    floor: "top",
    description: "Private room responsibility for Finley.",
    everyone_uses: false,
    excluded_members: ["Alex", "Blair", "Casey", "Devin", "Ellis"],
  },
];

export const defaultTasks: Task[] = [
  {
    id: "task-wash-dishes",
    title: "Wash dishes",
    description: "Clear sink, wash shared dishes, and reset drying area.",
    location: "Kitchen",
    difficulty: "easy",
    points: 3,
    assigned_person: "00000000-0000-4000-8000-000000000102",
    completed_by: null,
    due_date: iso(today),
    frequency: "daily",
    status: "pending",
    proof_required: false,
    photo_url: null,
    created_at: iso(subDays(today, 3)),
  },
  {
    id: "task-kitchen-cleanup",
    title: "Kitchen cleanup",
    description: "Wipe counters, check stove splashes, and reset shared surfaces.",
    location: "Kitchen",
    difficulty: "medium",
    points: 6,
    assigned_person: "00000000-0000-4000-8000-000000000104",
    completed_by: null,
    due_date: iso(today),
    frequency: "daily",
    status: "pending",
    proof_required: false,
    photo_url: null,
    created_at: iso(subDays(today, 2)),
  },
  {
    id: "task-trash-checks",
    title: "Trash checks",
    description: "Check kitchen, bathroom, and food waste bags before night.",
    location: "Kitchen",
    difficulty: "easy",
    points: 3,
    assigned_person: "00000000-0000-4000-8000-000000000105",
    completed_by: null,
    due_date: iso(today),
    frequency: "daily",
    status: "pending",
    proof_required: false,
    photo_url: null,
    created_at: iso(subDays(today, 2)),
  },
  {
    id: "task-clean-kitchen-shelves",
    title: "Clean kitchen shelves",
    description: "Wipe shared shelves, remove expired items, and keep labels visible.",
    location: "Kitchen",
    difficulty: "easy",
    points: 4,
    assigned_person: "00000000-0000-4000-8000-000000000101",
    completed_by: null,
    due_date: iso(addDays(today, 1)),
    frequency: "weekly",
    status: "pending",
    proof_required: false,
    photo_url: null,
    created_at: iso(subDays(today, 6)),
  },
  {
    id: "task-clean-sink",
    title: "Clean sink",
    description: "Scrub sink, taps, drain basket, and surrounding counter.",
    location: "Kitchen",
    difficulty: "easy",
    points: 3,
    assigned_person: "00000000-0000-4000-8000-000000000103",
    completed_by: null,
    due_date: iso(addDays(today, 1)),
    frequency: "daily",
    status: "pending",
    proof_required: false,
    photo_url: null,
    created_at: iso(subDays(today, 2)),
  },
  {
    id: "task-indoor-trash",
    title: "Take indoor trash",
    description: "Move full indoor bins to outside bins and replace liners.",
    location: "Kitchen",
    difficulty: "easy",
    points: 3,
    assigned_person: "00000000-0000-4000-8000-000000000106",
    completed_by: null,
    due_date: iso(today),
    frequency: "daily",
    status: "pending",
    proof_required: false,
    photo_url: null,
    created_at: iso(subDays(today, 2)),
  },
  {
    id: "task-ground-floor-mop",
    title: "Vacuum and mop ground floor",
    description: "Vacuum the TV/main room, kitchen edges, and mop shared ground floor.",
    location: "Ground floor",
    difficulty: "heavy",
    points: 8,
    assigned_person: "00000000-0000-4000-8000-000000000104",
    completed_by: null,
    due_date: iso(addDays(today, 2)),
    frequency: "weekly",
    status: "pending",
    proof_required: true,
    photo_url: null,
    created_at: iso(subDays(today, 7)),
  },
  {
    id: "task-ground-bathroom",
    title: "Clean ground floor bathroom",
    description: "Toilet, sink, mirror, floor, bin, and guest-ready finish.",
    location: "Ground floor bathroom",
    difficulty: "heavy",
    points: 7,
    assigned_person: "00000000-0000-4000-8000-000000000103",
    completed_by: null,
    due_date: iso(addDays(today, 3)),
    frequency: "weekly",
    status: "pending",
    proof_required: true,
    photo_url: null,
    created_at: iso(subDays(today, 7)),
  },
  {
    id: "task-top-bathroom",
    title: "Clean top floor bathroom",
    description: "Toilet, shower, sink, mirror, floor, and towel area. Blair is excluded.",
    location: "Top floor bathroom",
    difficulty: "heavy",
    points: 8,
    assigned_person: "00000000-0000-4000-8000-000000000106",
    completed_by: null,
    due_date: iso(addDays(today, 4)),
    frequency: "weekly",
    status: "pending",
    proof_required: true,
    photo_url: null,
    created_at: iso(subDays(today, 7)),
  },
  {
    id: "task-deep-kitchen",
    title: "Deep kitchen cleaning",
    description: "Shelves, stove, sink, appliances, floor edges, and shared food reset.",
    location: "Kitchen",
    difficulty: "heavy",
    points: 8,
    assigned_person: "00000000-0000-4000-8000-000000000105",
    completed_by: null,
    due_date: iso(addDays(today, 5)),
    frequency: "monthly",
    status: "pending",
    proof_required: true,
    photo_url: null,
    created_at: iso(subDays(today, 25)),
  },
  {
    id: "task-bin-responsibility",
    title: "Bin responsibility",
    description: "Put bins outside on collection night and bring them back.",
    location: "Outside bins",
    difficulty: "heavy",
    points: 6,
    assigned_person: "00000000-0000-4000-8000-000000000101",
    completed_by: null,
    due_date: iso(addDays(today, 1)),
    frequency: "weekly",
    status: "pending",
    proof_required: false,
    photo_url: null,
    created_at: iso(subDays(today, 7)),
  },
  {
    id: "task-clean-stairs",
    title: "Clean stairs",
    description: "Vacuum stairs, wipe rail, and clear anything left on steps.",
    location: "Stairs",
    difficulty: "medium",
    points: 4,
    assigned_person: "00000000-0000-4000-8000-000000000102",
    completed_by: null,
    due_date: iso(addDays(today, 2)),
    frequency: "weekly",
    status: "pending",
    proof_required: false,
    photo_url: null,
    created_at: iso(subDays(today, 7)),
  },
  {
    id: "task-clean-hallway",
    title: "Clean hallway",
    description: "Vacuum top hallway, clear shared clutter, and wipe visible marks.",
    location: "Hallway",
    difficulty: "medium",
    points: 4,
    assigned_person: "00000000-0000-4000-8000-000000000106",
    completed_by: null,
    due_date: iso(addDays(today, 3)),
    frequency: "weekly",
    status: "pending",
    proof_required: false,
    photo_url: null,
    created_at: iso(subDays(today, 7)),
  },
  {
    id: "task-washing-machine-area",
    title: "Clean washing machine area",
    description: "Wipe detergent marks, clear lint, and organize laundry supplies.",
    location: "Washing machine area",
    difficulty: "medium",
    points: 3,
    assigned_person: "00000000-0000-4000-8000-000000000103",
    completed_by: null,
    due_date: iso(addDays(today, 4)),
    frequency: "weekly",
    status: "pending",
    proof_required: false,
    photo_url: null,
    created_at: iso(subDays(today, 7)),
  },
];

export const taskHistory: TaskHistory[] = [
  {
    id: "history-1",
    task_id: "task-top-bathroom",
    assigned_person: "00000000-0000-4000-8000-000000000101",
    completed_by: "00000000-0000-4000-8000-000000000101",
    points_awarded: 8,
    difficulty: "heavy",
    completed_at: iso(subDays(today, 7)),
    ai_proof_status: "accepted",
  },
  {
    id: "history-2",
    task_id: "task-ground-bathroom",
    assigned_person: "00000000-0000-4000-8000-000000000106",
    completed_by: "00000000-0000-4000-8000-000000000106",
    points_awarded: 7,
    difficulty: "heavy",
    completed_at: iso(subDays(today, 8)),
    ai_proof_status: "accepted",
  },
  {
    id: "history-3",
    task_id: "task-deep-kitchen",
    assigned_person: "00000000-0000-4000-8000-000000000103",
    completed_by: "00000000-0000-4000-8000-000000000103",
    points_awarded: 8,
    difficulty: "heavy",
    completed_at: iso(subDays(today, 10)),
    ai_proof_status: "accepted",
  },
  {
    id: "history-4",
    task_id: "task-wash-dishes",
    assigned_person: "00000000-0000-4000-8000-000000000102",
    completed_by: "00000000-0000-4000-8000-000000000102",
    points_awarded: 3,
    difficulty: "easy",
    completed_at: iso(subDays(today, 1)),
    ai_proof_status: null,
  },
  {
    id: "history-5",
    task_id: "task-kitchen-cleanup",
    assigned_person: "00000000-0000-4000-8000-000000000104",
    completed_by: "00000000-0000-4000-8000-000000000104",
    points_awarded: 6,
    difficulty: "medium",
    completed_at: iso(subDays(today, 2)),
    ai_proof_status: null,
  },
];

export const pointsLedger: PointsLedgerEntry[] = [
  ...users.map((user, index) => ({
    id: `ledger-base-${index}`,
    user_id: user.id,
    task_id: null,
    complaint_id: null,
    points_delta: user.current_points,
    reason: "Starting fairness balance",
    created_at: iso(subDays(today, 12)),
  })),
  {
    id: "ledger-complaint-1",
    user_id: "00000000-0000-4000-8000-000000000105",
    task_id: null,
    complaint_id: "complaint-1",
    points_delta: -1,
    reason: "Confirmed missed trash reset",
    created_at: iso(subDays(today, 4)),
  },
];

export const complaints: Complaint[] = [
  {
    id: "complaint-1",
    reporter: "00000000-0000-4000-8000-000000000106",
    person_involved: "00000000-0000-4000-8000-000000000105",
    location: "Kitchen",
    category: "Trash issue",
    description: "Food waste bag was full after dinner and left overnight.",
    image_url: null,
    date: iso(subDays(today, 4)),
    status: "resolved",
    confirm_votes: 3,
    reject_votes: 0,
    created_at: iso(subDays(today, 4)),
  },
  {
    id: "complaint-2",
    reporter: "00000000-0000-4000-8000-000000000104",
    person_involved: "00000000-0000-4000-8000-000000000102",
    location: "Kitchen",
    category: "Dirty dishes",
    description: "Shared pans left in sink after midnight.",
    image_url: null,
    date: iso(subDays(today, 1)),
    status: "open",
    confirm_votes: 0,
    reject_votes: 0,
    created_at: iso(subDays(today, 1)),
  },
];

export const complaintVotes: ComplaintVote[] = [];

export const groceries: GroceryItem[] = [
  ["Milk", "Fresh", "running_low"],
  ["Bread", "Bakery", "available"],
  ["Onions", "Vegetables", "available"],
  ["Tomatoes", "Vegetables", "needed"],
  ["Eggs", "Fresh", "running_low"],
  ["Naan", "Bakery", "available"],
  ["Chicken", "Meat", "needed"],
  ["Potatoes", "Vegetables", "available"],
  ["Oil bottle", "Pantry", "running_low"],
  ["Hand wash", "Cleaning", "available"],
  ["Laundry powder", "Cleaning", "available"],
  ["Dishwashing liquid", "Cleaning", "needed"],
  ["Sponges", "Cleaning", "running_low"],
  ["Metal dish scrubber", "Cleaning", "available"],
  ["Fries", "Frozen", "available"],
  ["Honey", "Pantry", "available"],
  ["Sugar", "Pantry", "available"],
  ["Garlic sauce", "Sauces", "needed"],
  ["Ketchup", "Sauces", "available"],
  ["Other sauces", "Sauces", "available"],
  ["Ice cream", "Frozen", "needed"],
  ["Tissue rolls", "Household", "running_low"],
  ["Bin bags", "Household", "needed"],
  ["Small white food waste bags", "Household", "running_low"],
  ["Spray cleaner", "Cleaning", "available"],
].map(([name, category, status], index) => ({
  id: `grocery-${index + 1}`,
  name,
  category,
  status: status as GroceryItem["status"],
  added_by: users[index % users.length].id,
  bought_by: status === "available" ? users[(index + 2) % users.length].id : null,
  date: iso(subDays(today, index % 8)),
  price: null,
  notes: null,
  created_at: iso(subDays(today, 20 - (index % 10))),
}));

export const notifications: HouseNotification[] = [
  {
    id: "notification-bin",
    recipient: "00000000-0000-4000-8000-000000000101",
    title: "Bins tonight",
    body: "Reminder: Put bins outside tonight.",
    type: "task",
    scheduled_for: `${iso(addDays(today, 1))}T20:00:00.000Z`,
    read_at: null,
    payload: { task: "Bin responsibility" },
    created_at: iso(today),
  },
  {
    id: "notification-ai",
    recipient: null,
    title: "Weekly plan ready",
    body: "New fair weekly cleaning plan is ready.",
    type: "ai",
    scheduled_for: null,
    read_at: null,
    payload: {},
    created_at: iso(today),
  },
];

export const availability: AvailabilityPreference[] = users.flatMap((user, userIndex) =>
  [1, 2, 3, 4, 5, 6, 0].map((day, dayIndex) => ({
    id: `availability-${user.id}-${day}`,
    user_id: user.id,
    day_of_week: day,
    preferred_window:
      (userIndex + dayIndex) % 3 === 0
        ? "Evening"
        : (userIndex + dayIndex) % 3 === 1
          ? "Afternoon"
          : "Morning",
    unavailable: day === 5 && user.name === "Blair",
    notes: null,
  })),
);

export const aiRecommendations: AIRecommendation[] = [
  {
    id: "ai-rec-1",
    type: "weekly_plan",
    title: "Bathroom rotation adjustment",
    summary:
      "Avoid Alex for top floor bathroom this week because he completed it last week.",
    recommendation: {
      avoid: ["00000000-0000-4000-8000-000000000101"],
      assign_to: "00000000-0000-4000-8000-000000000106",
      task: "Clean top floor bathroom",
    },
    status: "draft",
    generated_by: "HouseFair AI Manager",
    created_at: iso(today),
  },
];

export const proofImages: ProofImage[] = [
  {
    id: "proof-1",
    task_id: "task-top-bathroom",
    uploaded_by: "00000000-0000-4000-8000-000000000101",
    before_url: null,
    after_url: null,
    ai_status: "accepted",
    ai_feedback: "Proof accepted",
    confidence_score: 88,
    cleanliness_improvement_score: 81,
    recommendation: "Looks improved. Keep shower glass and floor edges in frame next time.",
    created_at: iso(subDays(today, 7)),
  },
];

export const userDevices: UserDevice[] = [];
export const shoppingSessions: ShoppingSession[] = [];
export const houseAnnouncements: HouseAnnouncement[] = [];
export const guestStatus: GuestStatus[] = users.map((user, index) => ({
  id: `guest-${index + 1}`,
  user_id: user.id,
  guest_staying: false,
  guest_count: 0,
  notes: null,
  updated_at: iso(today),
  created_at: iso(subDays(today, 1)),
}));
export const expenses: Expense[] = [];
export const expenseSplits: ExpenseSplit[] = [];
export const settlements: Settlement[] = [];
export const recurringExpenses: RecurringExpense[] = [];
export const budgets: Budget[] = [
  {
    id: "budget-food",
    category: "Food",
    monthly_limit: 300,
    created_by: null,
    created_at: iso(today),
    updated_at: iso(today),
  },
  {
    id: "budget-cleaning",
    category: "Cleaning",
    monthly_limit: 50,
    created_by: null,
    created_at: iso(today),
    updated_at: iso(today),
  },
];
export const moneyComments: MoneyComment[] = [];
export const receipts: Receipt[] = [];

export const taskSwaps: TaskSwap[] = [
  {
    id: "swap-1",
    task_id: "task-ground-floor-mop",
    requested_by: "00000000-0000-4000-8000-000000000104",
    accepted_by: null,
    status: "requested",
    reason: "Devin is unavailable Thursday evening and needs a fair swap.",
    created_at: iso(subDays(today, 1)),
    updated_at: iso(subDays(today, 1)),
  },
];

export const rewards: Reward[] = [
  {
    id: "reward-1",
    user_id: "00000000-0000-4000-8000-000000000106",
    kind: "cleaning_champion",
    title: "Cleaning Champion",
    description: "Highest balanced contribution this month.",
    earned_at: iso(subDays(today, 2)),
  },
  {
    id: "reward-2",
    user_id: "00000000-0000-4000-8000-000000000101",
    kind: "bathroom_hero",
    title: "Bathroom Hero",
    description: "Completed a heavy bathroom task with accepted proof.",
    earned_at: iso(subDays(today, 7)),
  },
  {
    id: "reward-3",
    user_id: "00000000-0000-4000-8000-000000000105",
    kind: "trash_master",
    title: "Trash Master",
    description: "Kept trash checks moving across the week.",
    earned_at: iso(subDays(today, 4)),
  },
];

export const auditLogs = [
  {
    id: "audit-1",
    user_id: "00000000-0000-4000-8000-000000000106",
    device_id: "seed-device",
    action: "completed_task",
    entity_type: "task",
    entity_id: "task-ground-bathroom",
    metadata: { title: "Clean ground floor bathroom" },
    created_at: iso(subDays(today, 8)),
  },
  {
    id: "audit-2",
    user_id: "00000000-0000-4000-8000-000000000101",
    device_id: "seed-device",
    action: "earned_reward",
    entity_type: "reward",
    entity_id: "reward-2",
    metadata: { title: "Bathroom Hero" },
    created_at: iso(subDays(today, 7)),
  },
];

export const recurringTaskRules: RecurringTaskRule[] = [
  {
    id: "rule-dishes",
    title: "Dish responsibility",
    location: "Kitchen",
    difficulty: "easy",
    points: 3,
    frequency: "daily",
    day_of_week: null,
    proof_required: false,
    active: true,
    created_at: iso(subDays(today, 30)),
  },
  {
    id: "rule-trash",
    title: "Trash checks",
    location: "Kitchen",
    difficulty: "easy",
    points: 3,
    frequency: "every_second_day",
    day_of_week: null,
    proof_required: false,
    active: true,
    created_at: iso(subDays(today, 30)),
  },
  {
    id: "rule-bathrooms",
    title: "Bathroom rotation",
    location: "Bathrooms",
    difficulty: "heavy",
    points: 8,
    frequency: "weekly",
    day_of_week: 6,
    proof_required: true,
    active: true,
    created_at: iso(subDays(today, 30)),
  },
  {
    id: "rule-bins-out",
    title: "Bins outside",
    location: "Outside bins",
    difficulty: "heavy",
    points: 6,
    frequency: "weekly",
    day_of_week: 4,
    proof_required: false,
    active: true,
    created_at: iso(subDays(today, 30)),
  },
  {
    id: "rule-bins-return",
    title: "Bring bins back",
    location: "Outside bins",
    difficulty: "medium",
    points: 3,
    frequency: "weekly",
    day_of_week: 5,
    proof_required: false,
    active: true,
    created_at: iso(subDays(today, 30)),
  },
];

export const cleanlinessScores: CleanlinessScore[] = [
  { label: "Kitchen", score: 82, trend: "up" },
  { label: "Bathrooms", score: 70, trend: "flat" },
  { label: "Trash", score: 90, trend: "up" },
  { label: "Overall", score: 81, trend: "up" },
];

export function buildStats(state: Omit<HouseState, "stats" | "source">): HouseStats {
  const pendingTasks = state.tasks.filter((task) => task.status !== "completed").length;
  const groceryAlerts = state.groceries.filter((item) =>
    ["running_low", "needed"].includes(item.status),
  ).length;
  const openComplaints = state.complaints.filter((complaint) =>
    ["open", "denied", "disputed"].includes(complaint.status),
  ).length;
  const hasActivity =
    state.task_history.length > 0 ||
    state.points_ledger.length > 0 ||
    state.complaints.length > 0 ||
    state.rewards.length > 0;

  const points = new Map(state.users.map((user) => [user.id, user.current_points]));
  for (const entry of state.points_ledger) {
    points.set(entry.user_id, (points.get(entry.user_id) ?? 0) + entry.points_delta);
  }

  const weeklyRank = [...points.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([user_id, value], index) => ({ user_id, points: value, rank: index + 1 }));

  const heavyCounts = state.users.map((user) => ({
    user_id: user.id,
    count: state.task_history.filter(
      (history) => history.completed_by === user.id && history.difficulty === "heavy",
    ).length,
  }));
  const hasHeavyHistory = heavyCounts.some((entry) => entry.count > 0);

  const monthlyFairness = state.users
    .map((user) => {
      const completed = state.task_history.filter(
        (history) => history.completed_by === user.id,
      );
      const positive =
        completed.reduce((total, history) => total + history.points_awarded, 0) +
        state.rewards.filter((reward) => reward.user_id === user.id).length * 6;
      const negative =
        state.complaints.filter(
          (complaint) =>
            complaint.person_involved === user.id &&
            ["confirmed", "resolved"].includes(complaint.status),
        ).length *
          5 +
        state.tasks.filter(
          (task) => task.assigned_person === user.id && task.status === "overdue",
        ).length *
          4;

      return {
        user_id: user.id,
        score: clamp(50 + positive - negative, 0, 100),
        positive,
        negative,
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  const overall =
    state.cleanliness_scores.find((score) => score.label === "Overall")?.score ??
    clamp(100 - pendingTasks * 3 - openComplaints * 4, 45, 96);
  const kitchenStatus =
    state.cleanliness_scores.find((score) => score.label === "Kitchen")?.score ??
    clamp(94 - state.tasks.filter((task) => task.location === "Kitchen" && task.status !== "completed").length * 8 - openComplaints * 2, 35, 96);
  const bathroomStatus =
    state.cleanliness_scores.find((score) => score.label === "Bathrooms")?.score ??
    clamp(92 - state.tasks.filter((task) => task.location.toLowerCase().includes("bathroom") && task.status !== "completed").length * 12 - openComplaints * 3, 30, 96);
  const trashStatus =
    state.cleanliness_scores.find((score) => score.label === "Trash")?.score ??
    clamp(94 - state.tasks.filter((task) => task.title.toLowerCase().includes("trash") && task.status !== "completed").length * 10, 35, 98);
  const averageFairness =
    monthlyFairness.reduce((total, entry) => total + entry.score, 0) /
    Math.max(monthlyFairness.length, 1);
  const spread =
    Math.max(...weeklyRank.map((entry) => entry.points)) -
    Math.min(...weeklyRank.map((entry) => entry.points));

  return {
    house_cleanliness: overall,
    house_balance_score: Math.round(clamp(averageFairness - spread * 0.4, 0, 100)),
    kitchen_status: kitchenStatus,
    bathroom_status: bathroomStatus,
    trash_status: trashStatus,
    pending_tasks: pendingTasks,
    grocery_alerts: groceryAlerts,
    open_complaints: openComplaints,
    most_helpful_user_id: hasActivity ? (weeklyRank[0]?.user_id ?? null) : null,
    most_improved_user_id: hasHeavyHistory
      ? ([...heavyCounts].sort((a, b) => a.count - b.count)[0]?.user_id ?? null)
      : null,
    heavy_distribution: heavyCounts,
    weekly_rank: weeklyRank,
    monthly_fairness_rank: monthlyFairness,
  };
}

export function createSeedHouseState(): HouseState {
  const cleanUsers = users.map((user) => ({
    ...user,
    current_points: 0,
    cleaning_streak: 0,
  }));
  const groceryCatalog = groceries.map((item) => ({
    ...item,
    status: "available" as const,
    added_by: null,
    bought_by: null,
    price: null,
    notes: null,
  }));
  const base = {
    users: cleanUsers,
    rooms,
    areas,
    tasks: defaultTasks,
    task_history: [],
    points_ledger: [],
    complaints: [],
    complaint_votes: [],
    groceries: groceryCatalog,
    notifications: [],
    availability,
    user_preferences: [],
    house_settings: [{ key: "house_mode", value: { mode: "normal" }, updated_at: iso(today) }],
    house_rule_acceptances: [],
    weekly_reports: [],
    ai_recommendations: [],
    proof_images: [],
    user_devices: [],
    task_swaps: [],
    shopping_sessions: [],
    house_announcements: [],
    guest_status: guestStatus,
    expenses: [],
    expense_splits: [],
    settlements: [],
    recurring_expenses: recurringExpenses,
    budgets,
    money_comments: [],
    receipts: [],
    rewards: [],
    audit_logs: [],
    recurring_task_rules: recurringTaskRules,
    cleanliness_scores: [],
    house_mode: "normal" as const,
  };

  return {
    ...base,
    stats: buildStats(base),
    source: "seed",
  };
}
