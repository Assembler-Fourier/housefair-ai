import { NextResponse } from "next/server";
import Stripe from "stripe";
import { recordBillingEvent, upsertSubscriptionFromStripe } from "@/lib/saas/billing";
import { getRequiredEnv } from "@/lib/saas/server-config";
import { getStripe } from "@/lib/stripe/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const rawBody = await request.text();
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      getRequiredEnv("STRIPE_WEBHOOK_SECRET"),
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid webhook signature." },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const { data: existing } = await admin
    .from("stripe_webhook_events")
    .select("id")
    .eq("id", event.id)
    .maybeSingle<{ id: string }>();

  if (existing) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const { error: eventInsertError } = await admin.from("stripe_webhook_events").insert({
    id: event.id,
    type: event.type,
  });
  if (eventInsertError) throw eventInsertError;

  try {
    const object = event.data.object;
    let householdId: string | null = null;

    switch (event.type) {
      case "checkout.session.completed": {
        const session = object as Stripe.Checkout.Session;
        householdId = session.metadata?.household_id ?? null;
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id,
          );
          await upsertSubscriptionFromStripe(subscription);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = object as Stripe.Subscription;
        householdId = subscription.metadata.household_id ?? null;
        await upsertSubscriptionFromStripe(subscription);
        break;
      }
      case "invoice.payment_succeeded":
      case "invoice.payment_failed": {
        const invoice = object as Stripe.Invoice;
        const invoiceSubscription = (
          invoice as Stripe.Invoice & {
            subscription?: string | Stripe.Subscription | null;
          }
        ).subscription;
        if (invoiceSubscription) {
          const subscription = await stripe.subscriptions.retrieve(
            typeof invoiceSubscription === "string"
              ? invoiceSubscription
              : invoiceSubscription.id,
          );
          householdId = subscription.metadata.household_id ?? null;
          await upsertSubscriptionFromStripe(subscription);
        }
        break;
      }
      case "customer.deleted":
        break;
      default:
        break;
    }

    await recordBillingEvent({
      householdId,
      eventType: event.type,
      payload: object,
    });

    await admin
      .from("stripe_webhook_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("id", event.id);

    return NextResponse.json({ received: true });
  } catch (error) {
    await admin.from("system_logs").insert({
      level: "error",
      source: "stripe.webhook",
      message: error instanceof Error ? error.message : "Stripe webhook failed.",
      metadata: { event_id: event.id, event_type: event.type },
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook processing failed." },
      { status: 500 },
    );
  }
}
