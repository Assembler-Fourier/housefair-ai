"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function BillingPortalButton({
  householdId,
  disabled,
}: {
  householdId: string;
  disabled?: boolean;
}) {
  const [loading, setLoading] = React.useState(false);

  async function openPortal() {
    setLoading(true);
    try {
      const response = await fetch("/api/billing/create-portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ household_id: householdId }),
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error ?? "Could not open billing portal.");
      window.location.href = payload.url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open billing portal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button className="w-full" variant="premium" disabled={disabled || loading} onClick={openPortal}>
      {loading ? "Opening..." : "Manage billing in Stripe"}
    </Button>
  );
}
