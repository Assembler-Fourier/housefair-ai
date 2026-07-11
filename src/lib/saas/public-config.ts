export const productName = "HouseFair";
export const aiAssistantName = "HouseFair AI";
export const productTagline =
  "Fair chores, groceries, issues, and shared money for roommates.";

export const pricing = {
  earlyAccess: {
    label: "Early access",
    amount: "Free",
    suffix: "all household features included",
  },
  monthly: {
    label: "Monthly",
    amount: "€4.99",
    suffix: "/month per household",
    period: "monthly" as const,
  },
  yearly: {
    label: "Annual",
    amount: "€49.99",
    suffix: "/year per household",
    period: "yearly" as const,
  },
  trialDays: 7,
  memberLimit: 8,
};

export const marketingFeatures = [
  "Chore rotations with fairness explanations",
  "Groceries, shopping mode, and restock predictions",
  "House issues without turning roommates against each other",
  "Splitwise-style shared expenses and settlements",
  "Photo proof for heavy cleaning tasks",
  "Offline-ready installable PWA",
  "AI weekly planning that recommends, never punishes",
];

export const appNavItems = [
  { label: "Today", href: "/app/today" },
  { label: "Tasks", href: "/app/tasks" },
  { label: "Money", href: "/app/money" },
  { label: "Groceries", href: "/app/groceries" },
  { label: "More", href: "/app/more" },
];
