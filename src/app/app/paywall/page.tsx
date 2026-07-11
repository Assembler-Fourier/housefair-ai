import { PaywallActions } from "@/app/app/paywall/paywall-client";
import { GlassCard } from "@/components/ui/card";
import { canManageBilling, requireHousehold } from "@/lib/saas/auth";
import { pricing } from "@/lib/saas/public-config";
import { isFreeLaunch } from "@/lib/saas/access";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PaywallPage() {
  if (isFreeLaunch()) redirect("/app/today");
  const { household } = await requireHousehold({ allowUnpaid: true });
  const canStartCheckout = canManageBilling(household.role);

  return (
    <main className="mx-auto grid min-h-screen max-w-[460px] place-items-center px-4 py-10">
      <GlassCard className="w-full p-6">
        <p className="text-sm font-black uppercase text-primary">Activate HouseFair</p>
        <h1 className="mt-3 text-3xl font-black">Start the household trial.</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          HouseFair is {pricing.monthly.amount}/month per household with a {pricing.trialDays}-day
          free trial and up to {pricing.memberLimit} roommates included.
        </p>
        <div className="mt-5 grid gap-3 rounded-2xl bg-background/70 p-4 text-sm text-muted-foreground">
          <p>Chores, groceries, issues, and shared money in one place.</p>
          <p>Stripe Checkout handles payment details securely.</p>
          <p>Cancel anytime through Stripe Customer Portal.</p>
        </div>
        <div className="mt-5">
          <PaywallActions householdId={household.id} canStartCheckout={canStartCheckout} />
        </div>
      </GlassCard>
    </main>
  );
}
