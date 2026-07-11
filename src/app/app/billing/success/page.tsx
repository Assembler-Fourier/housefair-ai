import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/card";

export default function BillingSuccessPage() {
  return (
    <main className="mx-auto grid min-h-screen max-w-[460px] place-items-center px-4 py-10">
      <GlassCard className="p-6 text-center">
        <p className="text-sm font-black uppercase text-primary">Billing</p>
        <h1 className="mt-3 text-3xl font-black">Trial started.</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Stripe will confirm the subscription through the webhook. If the app still shows
          the paywall, refresh after a moment.
        </p>
        <Button asChild className="mt-5" variant="premium">
          <Link href="/app/today">Open HouseFair</Link>
        </Button>
      </GlassCard>
    </main>
  );
}
