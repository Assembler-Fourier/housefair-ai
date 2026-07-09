export const memberNames = [
  "Uzair",
  "Sheraz",
  "Shahram",
  "Hammad",
  "Usama",
  "Ali",
] as const;

export type MemberName = (typeof memberNames)[number];
export type TaskFrequency = "daily" | "weekly" | "monthly";
export type TaskDifficulty = "easy" | "medium" | "heavy";
export type TaskStatus = "pending" | "in_progress" | "completed" | "overdue";
export type ComplaintStatus =
  | "open"
  | "accepted"
  | "denied"
  | "disputed"
  | "resolved"
  | "confirmed"
  | "rejected";
export type GroceryStatus = "available" | "running_low" | "needed" | "bought";
export type ComplaintIssueType = "report" | "cleanup_request" | "reminder";
export type AIRecommendationStatus = "draft" | "applied" | "dismissed";
export type ProofStatus = "pending" | "accepted" | "needs_clearer_proof";
export type TaskSwapStatus = "requested" | "accepted" | "declined" | "cancelled";
export type TaskStylePreference = "heavy" | "light" | "weekend" | "evening";
export type HouseMode = "normal" | "guests_coming" | "deep_clean_week" | "party_mode";
export type MoneyCategory =
  | "Food"
  | "Cleaning"
  | "Bills"
  | "Internet"
  | "Electricity"
  | "Transport"
  | "Entertainment"
  | "Emergency"
  | "Other";
export type SplitType = "equal" | "unequal" | "percentage" | "shares" | "exact";
export type SettlementMethod = "cash" | "bank_transfer" | "other";
export type RecurringExpenseFrequency = "weekly" | "monthly";
export type RewardKind =
  | "cleaning_champion"
  | "bathroom_hero"
  | "trash_master"
  | "helping_hand"
  | "perfect_week";

export type Room = {
  id: string;
  name: string;
  floor: "ground" | "top";
  capacity: number;
  privacy_level: "shared" | "single" | "private_bathroom";
};

export type HouseUser = {
  id: string;
  name: MemberName;
  room_id: string;
  room_name: string;
  avatar_gradient: string;
  current_points: number;
  cleaning_streak: number;
  created_at: string;
};

export type Area = {
  id: string;
  name: string;
  floor: "ground" | "top" | "private";
  description: string;
  everyone_uses: boolean;
  excluded_members: MemberName[];
};

export type Task = {
  id: string;
  title: string;
  description: string;
  location: string;
  checklist_items?: string[];
  estimated_minutes?: number;
  difficulty: TaskDifficulty;
  points: number;
  assigned_person: string | null;
  completed_by: string | null;
  due_date: string;
  frequency: TaskFrequency;
  status: TaskStatus;
  proof_required: boolean;
  photo_url: string | null;
  before_photo_url?: string | null;
  after_photo_url?: string | null;
  deferral_count?: number;
  deferred_by?: string | null;
  deferred_at?: string | null;
  defer_reason?: string | null;
  next_reminder_at?: string | null;
  last_reminded_at?: string | null;
  created_at: string;
};

export type TaskHistory = {
  id: string;
  task_id: string;
  assigned_person: string | null;
  completed_by: string;
  points_awarded: number;
  difficulty: TaskDifficulty;
  completed_at: string;
  ai_proof_status: ProofStatus | null;
  notes?: string | null;
};

export type PointsLedgerEntry = {
  id: string;
  user_id: string;
  task_id: string | null;
  complaint_id: string | null;
  points_delta: number;
  reason: string;
  created_at: string;
};

export type ComplaintCategory =
  | "Dirty dishes"
  | "Kitchen mess"
  | "Bathroom mess"
  | "Trash issue"
  | "Noise"
  | "Guest issue"
  | "Missed task"
  | "Other";

export type Complaint = {
  id: string;
  reporter: string;
  person_involved: string;
  location: string;
  category: ComplaintCategory;
  issue_type?: ComplaintIssueType;
  description: string;
  image_url: string | null;
  date: string;
  status: ComplaintStatus;
  confirm_votes: number;
  reject_votes: number;
  created_at: string;
};

export type ComplaintVote = {
  id: string;
  complaint_id: string;
  voter: string;
  supports_complaint: boolean;
  created_at: string;
};

export type GroceryItem = {
  id: string;
  name: string;
  category: string;
  status: GroceryStatus;
  added_by: string | null;
  bought_by: string | null;
  date: string;
  price: number | null;
  notes: string | null;
  created_at: string;
};

export type ShoppingSession = {
  id: string;
  user_id: string;
  is_active: boolean;
  started_at: string | null;
  ended_at: string | null;
  updated_at: string;
  created_at: string;
};

export type HouseAnnouncement = {
  id: string;
  author: string | null;
  title: string;
  body: string;
  category: "guests" | "repairs" | "message";
  active: boolean;
  created_at: string;
};

export type GuestStatus = {
  id: string;
  user_id: string;
  guest_staying: boolean;
  guest_count: number;
  notes: string | null;
  updated_at: string;
  created_at: string;
};

export type Expense = {
  id: string;
  group_name: "House Expenses";
  title: string;
  amount: number;
  category: MoneyCategory;
  paid_by: string;
  paid_date: string;
  notes: string | null;
  receipt_url: string | null;
  split_type: SplitType;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ExpenseSplit = {
  id: string;
  expense_id: string;
  user_id: string;
  split_value: number | null;
  amount_owed: number;
  created_at: string;
};

export type Settlement = {
  id: string;
  payer: string;
  receiver: string;
  amount: number;
  method: SettlementMethod;
  notes: string | null;
  settled_at: string;
  created_at: string;
};

export type RecurringExpense = {
  id: string;
  title: string;
  amount: number;
  category: MoneyCategory;
  paid_by: string | null;
  frequency: RecurringExpenseFrequency;
  next_due_date: string;
  split_type: SplitType;
  active: boolean;
  notes: string | null;
  created_at: string;
};

export type Budget = {
  id: string;
  category: MoneyCategory;
  monthly_limit: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type MoneyComment = {
  id: string;
  expense_id: string;
  author: string;
  body: string;
  created_at: string;
};

export type Receipt = {
  id: string;
  expense_id: string | null;
  uploaded_by: string;
  image_url: string;
  store: string | null;
  items: Record<string, unknown>[];
  amount: number | null;
  category: MoneyCategory | null;
  ai_summary: string | null;
  created_at: string;
};

export type HouseNotification = {
  id: string;
  recipient: string | null;
  title: string;
  body: string;
  type: "task" | "complaint" | "ai" | "grocery" | "system";
  scheduled_for: string | null;
  read_at: string | null;
  payload: Record<string, unknown>;
  created_at: string;
};

export type AvailabilityPreference = {
  id: string;
  user_id: string;
  day_of_week: number;
  preferred_window: string;
  unavailable: boolean;
  notes: string | null;
};

export type UserPreference = {
  id: string;
  user_id: string;
  task_style: TaskStylePreference;
  updated_at: string;
  created_at: string;
};

export type HouseSetting = {
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
};

export type HouseRuleAcceptance = {
  id: string;
  user_id: string;
  accepted_at: string;
};

export type WeeklyReport = {
  id: string;
  week_start: string;
  report: Record<string, unknown>;
  created_at: string;
};

export type AIRecommendation = {
  id: string;
  type: "weekly_plan" | "grocery_prediction" | "proof_review" | "reminder";
  title: string;
  summary: string;
  recommendation: Record<string, unknown>;
  status: AIRecommendationStatus;
  generated_by: string | null;
  created_at: string;
};

export type ProofImage = {
  id: string;
  task_id: string;
  uploaded_by: string;
  before_url: string | null;
  after_url: string | null;
  ai_status: ProofStatus;
  ai_feedback: string;
  confidence_score?: number | null;
  cleanliness_improvement_score?: number | null;
  recommendation?: string | null;
  created_at: string;
};

export type UserDevice = {
  id?: string;
  device_id: string;
  person_id: string;
  last_active_at: string;
  created_at: string;
};

export type TaskSwap = {
  id: string;
  task_id: string;
  requested_by: string;
  accepted_by: string | null;
  status: TaskSwapStatus;
  reason: string | null;
  created_at: string;
  updated_at: string;
};

export type Reward = {
  id: string;
  user_id: string;
  kind: RewardKind;
  title: string;
  description: string;
  earned_at: string;
};

export type AuditLog = {
  id: string;
  user_id: string | null;
  device_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type RecurringTaskRule = {
  id: string;
  title: string;
  location: string;
  difficulty: TaskDifficulty;
  points: number;
  frequency: "daily" | "every_second_day" | "weekly";
  day_of_week: number | null;
  proof_required: boolean;
  active: boolean;
  created_at: string;
};

export type CleanlinessScore = {
  label: string;
  score: number;
  trend: "up" | "flat" | "down";
};

export type WeeklyAssignment = {
  task_title: string;
  location: string;
  assigned_to: string;
  reason: string;
  difficulty: TaskDifficulty;
  points: number;
  due_day: string;
};

export type GroceryPrediction = {
  item: string;
  confidence: number;
  reason: string;
  suggested_status: GroceryStatus;
};

export type WeeklyPlan = {
  title: string;
  generated_at: string;
  summary: string;
  assignments: WeeklyAssignment[];
  fairness_notes: string[];
  reminders: string[];
  grocery_predictions: GroceryPrediction[];
  cleanliness_scores: CleanlinessScore[];
  fairness_report?: string;
  cleaning_recommendations?: string[];
  house_mode?: HouseMode;
};

export type HouseStats = {
  house_cleanliness: number;
  house_balance_score: number;
  kitchen_status: number;
  bathroom_status: number;
  trash_status: number;
  pending_tasks: number;
  grocery_alerts: number;
  open_complaints: number;
  most_helpful_user_id: string | null;
  most_improved_user_id: string | null;
  heavy_distribution: Array<{ user_id: string; count: number }>;
  weekly_rank: Array<{ user_id: string; points: number; rank: number }>;
  monthly_fairness_rank: Array<{
    user_id: string;
    score: number;
    rank: number;
    positive: number;
    negative: number;
  }>;
};

export type HouseState = {
  users: HouseUser[];
  rooms: Room[];
  areas: Area[];
  tasks: Task[];
  task_history: TaskHistory[];
  points_ledger: PointsLedgerEntry[];
  complaints: Complaint[];
  complaint_votes: ComplaintVote[];
  groceries: GroceryItem[];
  notifications: HouseNotification[];
  availability: AvailabilityPreference[];
  user_preferences: UserPreference[];
  house_settings: HouseSetting[];
  house_rule_acceptances: HouseRuleAcceptance[];
  weekly_reports: WeeklyReport[];
  ai_recommendations: AIRecommendation[];
  proof_images: ProofImage[];
  user_devices: UserDevice[];
  task_swaps: TaskSwap[];
  shopping_sessions: ShoppingSession[];
  house_announcements: HouseAnnouncement[];
  guest_status: GuestStatus[];
  expenses: Expense[];
  expense_splits: ExpenseSplit[];
  settlements: Settlement[];
  recurring_expenses: RecurringExpense[];
  budgets: Budget[];
  money_comments: MoneyComment[];
  receipts: Receipt[];
  rewards: Reward[];
  audit_logs: AuditLog[];
  recurring_task_rules: RecurringTaskRule[];
  cleanliness_scores: CleanlinessScore[];
  house_mode: HouseMode;
  stats: HouseStats;
  source: "supabase" | "postgres" | "seed";
};
