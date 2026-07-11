import "server-only";

import Stripe from "stripe";
import { getRequiredEnv } from "@/lib/saas/server-config";

let stripe: Stripe | null = null;

export function getStripe() {
  stripe ??= new Stripe(getRequiredEnv("STRIPE_SECRET_KEY"), {
    appInfo: {
      name: "HouseFair",
      version: "1.0.0",
    },
  });

  return stripe;
}

export function getStripePriceId(period: "monthly" | "yearly") {
  return period === "monthly"
    ? getRequiredEnv("STRIPE_PRICE_MONTHLY_EUR")
    : getRequiredEnv("STRIPE_PRICE_YEARLY_EUR");
}
