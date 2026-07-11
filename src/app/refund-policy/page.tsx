import { MarketingPageShell } from "@/components/marketing-shell";

export default function RefundPolicyPage() {
  return (
    <MarketingPageShell>
      <main className="mx-auto max-w-3xl px-4 py-14">
        <h1 className="text-4xl font-black">Refund Policy</h1>
        <p className="mt-4 text-muted-foreground">
          Placeholder refund policy for legal review. The intended commercial plan includes
          free early access with no card required. This policy will be updated before paid billing is enabled.
        </p>
        <p className="mt-4 text-muted-foreground">
          Define refund windows, failed payment handling, and cancellation timing before
          switching Stripe from test mode to live mode.
        </p>
      </main>
    </MarketingPageShell>
  );
}
