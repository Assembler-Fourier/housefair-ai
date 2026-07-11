import "server-only";

import Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type BillingPeriod = "monthly" | "yearly";

export function unixToIso(timestamp?: number | null) {
  return timestamp ? new Date(timestamp * 1000).toISOString() : null;
}

export async function getOrCreateStripeCustomer(args: {
  householdId: string;
  householdName: string;
  email?: string | null;
  stripe: Stripe;
}) {
  const admin = getSupabaseAdmin();
  const { data: existing, error: existingError } = await admin
    .from("billing_customers")
    .select("stripe_customer_id")
    .eq("household_id", args.householdId)
    .maybeSingle<{ stripe_customer_id: string }>();

  if (existingError) throw existingError;
  if (existing?.stripe_customer_id) return existing.stripe_customer_id;

  const customer = await args.stripe.customers.create({
    email: args.email ?? undefined,
    name: args.householdName,
    metadata: {
      household_id: args.householdId,
    },
  });

  const { error: insertError } = await admin.from("billing_customers").insert({
    household_id: args.householdId,
    stripe_customer_id: customer.id,
  });

  if (insertError) throw insertError;
  return customer.id;
}

export async function upsertSubscriptionFromStripe(subscription: Stripe.Subscription) {
  const admin = getSupabaseAdmin();
  const subscriptionPeriods = subscription as Stripe.Subscription & {
    current_period_start?: number | null;
    current_period_end?: number | null;
    trial_start?: number | null;
    trial_end?: number | null;
  };
  const householdId = subscription.metadata.household_id;
  const stripeCustomerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
  const priceId = subscription.items.data[0]?.price.id ?? null;

  if (!householdId) {
    await admin.from("system_logs").insert({
      level: "warn",
      source: "stripe.webhook",
      message: "Subscription event missing household_id metadata.",
      metadata: { subscription_id: subscription.id },
    });
    return;
  }

  const { error } = await admin.from("subscriptions").upsert(
    {
      household_id: householdId,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      status: subscription.status,
      current_period_start: unixToIso(subscriptionPeriods.current_period_start),
      current_period_end: unixToIso(subscriptionPeriods.current_period_end),
      trial_start: unixToIso(subscriptionPeriods.trial_start),
      trial_end: unixToIso(subscriptionPeriods.trial_end),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );

  if (error) throw error;
}

export async function recordBillingEvent(args: {
  householdId?: string | null;
  eventType: string;
  payload: unknown;
}) {
  const admin = getSupabaseAdmin();
  await admin.from("billing_events").insert({
    household_id: args.householdId ?? null,
    event_type: args.eventType,
    payload: args.payload,
  });
}
