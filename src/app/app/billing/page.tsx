import Link from "next/link";
import { BillingPortalButton } from "@/app/app/billing/billing-client";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/card";
import { canManageBilling, requireHousehold, subscriptionAllowsAccess } from "@/lib/saas/auth";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const { household } = await requireHousehold({ allowUnpaid: true });
  const canManage = canManageBilling(household.role);
  const subscription = household.subscription;
  const active = subscriptionAllowsAccess(subscription);

  return (
    <main className="mx-auto min-h-screen max-w-[460px] px-4 py-8">
      <Button asChild variant="ghost">
        <Link href="/app/more">Back</Link>
      </Button>
      <GlassCard className="mt-4 p-6">
        <p className="text-sm font-black uppercase text-primary">Billing</p>
        <h1 className="mt-2 text-3xl font-black">{household.name}</h1>
        <div className="mt-5 grid gap-3 rounded-2xl bg-background/70 p-4 text-sm">
          <p>
            <span className="font-black">Status:</span>{" "}
            {subscription?.status ?? "No subscription"}
          </p>
          <p>
            <span className="font-black">Access:</span>{" "}
            {active ? "Enabled" : "Paywall"}
          </p>
          <p>
            <span className="font-black">Trial ends:</span>{" "}
            {subscription?.trialEnd ? new Date(subscription.trialEnd).toLocaleDateString() : "Not started"}
          </p>
          <p>
            <span className="font-black">Renews:</span>{" "}
            {subscription?.currentPeriodEnd
              ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
              : "Not available"}
          </p>
        </div>
        <div className="mt-5 grid gap-3">
          {subscription ? (
            <BillingPortalButton householdId={household.id} disabled={!canManage} />
          ) : (
            <Button asChild variant="premium">
              <Link href="/app/paywall">Start subscription</Link>
            </Button>
          )}
          {!canManage ? (
            <p className="text-sm text-muted-foreground">
              Ask the household owner or admin to manage billing.
            </p>
          ) : null}
        </div>
      </GlassCard>
    </main>
  );
}
