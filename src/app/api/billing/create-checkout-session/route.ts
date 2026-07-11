import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageBilling, getPrimaryHousehold, requireUser } from "@/lib/saas/auth";
import { getSiteUrl, getOptionalBooleanEnv } from "@/lib/saas/server-config";
import { getOrCreateStripeCustomer } from "@/lib/saas/billing";
import { getStripe, getStripePriceId } from "@/lib/stripe/server";

const checkoutSchema = z.object({
  household_id: z.string().uuid(),
  billing_period: z.enum(["monthly", "yearly"]),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const household = await getPrimaryHousehold(user.id);
    if (!household) {
      return NextResponse.json({ error: "Create or join a household first." }, { status: 400 });
    }

    const input = checkoutSchema.parse(await request.json());
    if (input.household_id !== household.id) {
      return NextResponse.json({ error: "Household mismatch." }, { status: 403 });
    }
    if (!canManageBilling(household.role)) {
      return NextResponse.json(
        { error: "Only a household owner or admin can start billing." },
        { status: 403 },
      );
    }

    const stripe = getStripe();
    const customerId = await getOrCreateStripeCustomer({
      householdId: household.id,
      householdName: household.name,
      email: user.email,
      stripe,
    });
    const siteUrl = getSiteUrl();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [
        {
          price: getStripePriceId(input.billing_period),
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          household_id: household.id,
          billing_period: input.billing_period,
        },
      },
      metadata: {
        household_id: household.id,
        billing_period: input.billing_period,
      },
      automatic_tax: {
        enabled: getOptionalBooleanEnv("STRIPE_TAX_ENABLED"),
      },
      billing_address_collection: getOptionalBooleanEnv("STRIPE_TAX_ENABLED")
        ? "required"
        : "auto",
      success_url: `${siteUrl}/app/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/pricing?cancelled=true`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create checkout session." },
      { status: 400 },
    );
  }
}
