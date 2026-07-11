"use client";

import * as React from "react";
import { toast } from "sonner";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pricing } from "@/lib/saas/public-config";

export function PaywallActions({
  householdId,
  canStartCheckout,
}: {
  householdId: string;
  canStartCheckout: boolean;
}) {
  const [loading, setLoading] = React.useState<"monthly" | "yearly" | null>(null);

  async function startCheckout(period: "monthly" | "yearly") {
    if (!canStartCheckout) return;
    setLoading(period);
    try {
      const response = await fetch("/api/billing/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ household_id: householdId, billing_period: period }),
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error ?? "Checkout failed.");
      window.location.href = payload.url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Checkout failed.");
    } finally {
      setLoading(null);
    }
  }

  if (!canStartCheckout) {
    return (
      <p className="rounded-2xl border border-border bg-background/70 p-4 text-sm text-muted-foreground">
        Ask the household owner or admin to activate HouseFair.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      <Button variant="premium" disabled={Boolean(loading)} onClick={() => startCheckout("monthly")}>
        <CreditCard className="size-4" />
        {loading === "monthly" ? "Opening..." : `Start ${pricing.monthly.amount}/month trial`}
      </Button>
      <Button variant="outline" disabled={Boolean(loading)} onClick={() => startCheckout("yearly")}>
        {loading === "yearly" ? "Opening..." : `Start ${pricing.yearly.amount}/year trial`}
      </Button>
    </div>
  );
}
