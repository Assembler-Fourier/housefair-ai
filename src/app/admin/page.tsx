import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/saas/auth";
import { isAdminEmail } from "@/lib/saas/server-config";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function getCount(table: string) {
  if (!isSupabaseConfigured()) return 0;
  const admin = getSupabaseAdmin();
  const { count, error } = await admin.from(table).select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

async function getSubscriptionCount(status: string) {
  if (!isSupabaseConfigured()) return 0;
  const admin = getSupabaseAdmin();
  const { count, error } = await admin
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("status", status);
  if (error) throw error;
  return count ?? 0;
}

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?next=/admin");
  if (!isAdminEmail(user.email)) redirect("/app/today");

  const [
    households,
    users,
    activeSubscriptions,
    trialSubscriptions,
    pastDueSubscriptions,
    cancelledSubscriptions,
    webhookEvents,
    appEvents,
  ] = await Promise.all([
    getCount("households"),
    getCount("profiles"),
    getSubscriptionCount("active"),
    getSubscriptionCount("trialing"),
    getSubscriptionCount("past_due"),
    getSubscriptionCount("canceled"),
    getCount("stripe_webhook_events"),
    getCount("app_events"),
  ]);

  if (isSupabaseConfigured()) {
    await getSupabaseAdmin().from("system_logs").insert({
      level: "info",
      source: "admin",
      message: "Admin dashboard viewed.",
      metadata: { email: user.email },
    });
  }

  const cards = [
    ["Households", households],
    ["Users", users],
    ["Active subscriptions", activeSubscriptions],
    ["Trials", trialSubscriptions],
    ["Past due", pastDueSubscriptions],
    ["Cancelled", cancelledSubscriptions],
    ["Stripe events", webhookEvents],
    ["Tracked app events", appEvents],
  ];

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase text-primary">Admin</p>
          <h1 className="mt-2 text-4xl font-black">HouseFair SaaS overview</h1>
        </div>
        <Button asChild variant="outline">
          <Link href="/app/today">App</Link>
        </Button>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value]) => (
          <GlassCard key={label} className="p-5">
            <p className="text-sm font-black text-muted-foreground">{label}</p>
            <p className="mt-3 text-3xl font-black">{value}</p>
          </GlassCard>
        ))}
      </div>
      <GlassCard className="mt-6 p-5">
        <p className="font-black">Support tools policy</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          V1 is read-only. No silent impersonation. Destructive actions such as deletion,
          forced backups, or Stripe resyncs need explicit confirmation modals before launch.
        </p>
      </GlassCard>
    </main>
  );
}
