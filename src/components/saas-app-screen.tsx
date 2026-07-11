import Link from "next/link";
import {
  Bell,
  Brain,
  CalendarCheck,
  CreditCard,
  Home,
  Receipt,
  Settings,
  ShoppingBasket,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/card";
import { appNavItems } from "@/lib/saas/public-config";
import type { HouseholdContext } from "@/lib/saas/auth";

const screenCopy = {
  today: {
    title: "Today",
    subtitle: "House command center for the current household.",
    cards: [
      ["House health", "86%", "Cleaning, money, groceries, and issues are in good shape."],
      ["Tasks due", "4", "Kitchen reset, trash check, bathroom, and bins."],
      ["Money balance", "€42", "Simplified balance for the household."],
    ],
  },
  tasks: {
    title: "Tasks",
    subtitle: "Commercial task routines will be tenant-scoped by household_id.",
    cards: [
      ["Kitchen reset", "20 min", "Checklist, points, estimated time, carry-over reminders."],
      ["Bathroom clean", "Proof", "Before/after photo support for heavy routines."],
      ["Task swaps", "Ready", "Members can request, accept, or cancel swaps."],
    ],
  },
  money: {
    title: "Money",
    subtitle: "Splitwise-style finance for the household.",
    cards: [
      ["House expenses", "Active", "Equal, unequal, percentage, shares, and exact splits."],
      ["Settlements", "Stripe-safe", "Cash, bank transfer, and other settlement records."],
      ["Budgets", "Monthly", "Food, cleaning, bills, internet, electricity, and more."],
    ],
  },
  groceries: {
    title: "Groceries",
    subtitle: "Shared shopping list with restock predictions and expense handoff.",
    cards: [
      ["Shopping mode", "Ready", "One person can mark that they are shopping."],
      ["Predictions", "AI", "Milk usually finishes every few days; suggest restock."],
      ["Expense handoff", "Money", "Bought groceries can become shared expenses."],
    ],
  },
  more: {
    title: "More",
    subtitle: "AI, notifications, settings, rules, and household admin.",
    cards: [
      ["AI Manager", "Plans", "Weekly plan, fairness report, grocery predictions."],
      ["Notifications", "Grouped", "Today, yesterday, and earlier."],
      ["Settings", "Commercial", "Members, invites, billing, data export, preferences."],
    ],
  },
  ai: {
    title: "HouseFair AI",
    subtitle: "Recommendation-only assistant for fair household planning.",
    cards: [
      ["Weekly plan", "Draft", "AI proposes assignments but never silently applies them."],
      ["Fairness", "Explained", "Reasoning includes workload, heavy tasks, money, and availability."],
      ["Groceries", "Predicted", "Consumption patterns drive restock suggestions."],
    ],
  },
};

export function SaasAppFrame({
  household,
  active,
  children,
}: {
  household: HouseholdContext;
  active: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-[460px] overflow-x-hidden px-3 pb-24 pt-4">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-muted-foreground">{household.name}</p>
          <h1 className="truncate text-xl font-black">HouseFair</h1>
        </div>
        <Button asChild size="icon" variant="glass" aria-label="Settings">
          <Link href="/app/settings">
            <Settings className="size-4" />
          </Link>
        </Button>
      </header>
      <main className="mt-5">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[460px] border-t border-white/30 bg-background/90 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 backdrop-blur-2xl dark:border-white/10">
        <div className="grid grid-cols-5 gap-1">
          {appNavItems.map((item) => {
            const selected = active === item.label.toLowerCase();
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-2xl px-2 py-2 text-center text-[11px] font-black transition ${
                  selected ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function SaasAppScreen({
  household,
  active,
}: {
  household: HouseholdContext;
  active: keyof typeof screenCopy;
}) {
  const copy = screenCopy[active];
  const icons = [Home, CalendarCheck, CreditCard, ShoppingBasket, Brain, Bell, Receipt, Users, Sparkles];

  return (
    <SaasAppFrame household={household} active={active === "ai" ? "more" : active}>
      <section>
        <p className="text-sm font-black uppercase text-primary">{copy.title}</p>
        <h2 className="mt-2 text-3xl font-black leading-tight">{copy.subtitle}</h2>
      </section>
      <div className="mt-5 grid gap-3">
        {copy.cards.map(([title, stat, body], index) => {
          const Icon = icons[index % icons.length];
          return (
            <GlassCard key={title} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
                </div>
                <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/12 text-primary">
                  <Icon className="size-5" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-black">{stat}</p>
            </GlassCard>
          );
        })}
      </div>
      <GlassCard className="mt-4 p-4">
        <p className="font-black">SaaS conversion status</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          This authenticated shell is tenant-aware and billing-gated. The next migration
          pass should replace the old private six-person task tables with household_member
          references throughout the operational workflows.
        </p>
      </GlassCard>
    </SaasAppFrame>
  );
}
