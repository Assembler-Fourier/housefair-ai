import { MarketingPageShell } from "@/components/marketing-shell";
import { GlassCard } from "@/components/ui/card";

export default function SecurityPage() {
  return (
    <MarketingPageShell>
      <main className="px-4 py-14">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-black uppercase text-primary">Security</p>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl">Designed for private household data.</h1>
          <p className="mt-4 max-w-3xl text-muted-foreground">
            HouseFair stores practical household information: tasks, expenses, receipts, issues,
            and notification preferences. The SaaS architecture is built so each household is
            isolated from the others.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              ["Authentication", "Supabase Auth is the commercial source of truth. PIN switching is not the SaaS security boundary."],
              ["Tenant isolation", "Household data is scoped by household_id with RLS helper functions and server-side checks."],
              ["Billing", "Stripe Checkout and Customer Portal handle card details. HouseFair does not store card numbers."],
              ["Secrets", "Service-role, Stripe secret, webhook, VAPID, and AI keys must live only in server environment variables."],
            ].map(([title, body]) => (
              <GlassCard key={title} className="p-5">
                <p className="font-black">{title}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </main>
    </MarketingPageShell>
  );
}
