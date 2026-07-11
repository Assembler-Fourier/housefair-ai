import { FeatureGrid, MarketingPageShell } from "@/components/marketing-shell";
import { GlassCard } from "@/components/ui/card";

const groups = [
  {
    title: "Chores",
    items: ["Recurring routines", "Task swaps", "Photo proof", "Fairness scoring", "Carry-over reminders"],
  },
  {
    title: "Money",
    items: ["Equal and custom splits", "IOUs", "Debt simplification", "Settlements", "Budgets"],
  },
  {
    title: "Groceries",
    items: ["Shopping mode", "Restock predictions", "Barcode scanner UI", "Bought-by tracking", "Expense handoff"],
  },
  {
    title: "House calm",
    items: ["House issues", "Announcements", "Guest tracking", "Notification center", "House rules"],
  },
];

export default function FeaturesPage() {
  return (
    <MarketingPageShell>
      <main className="px-4 py-14">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-black uppercase text-primary">Features</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black leading-tight sm:text-5xl">
            A roommate app that handles the jobs, money, groceries, and tension.
          </h1>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {groups.map((group) => (
              <GlassCard key={group.title} className="p-6">
                <h2 className="text-xl font-black">{group.title}</h2>
                <ul className="mt-4 grid gap-2 text-sm text-muted-foreground">
                  {group.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </GlassCard>
            ))}
          </div>
        </div>
      </main>
      <FeatureGrid />
    </MarketingPageShell>
  );
}
