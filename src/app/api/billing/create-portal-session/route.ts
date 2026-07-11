import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageBilling, getPrimaryHousehold, requireUser } from "@/lib/saas/auth";
import { getSiteUrl } from "@/lib/saas/server-config";
import { getStripe } from "@/lib/stripe/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const portalSchema = z.object({
  household_id: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const household = await getPrimaryHousehold(user.id);
    if (!household) {
      return NextResponse.json({ error: "Create or join a household first." }, { status: 400 });
    }

    const input = portalSchema.parse(await request.json());
    if (input.household_id !== household.id) {
      return NextResponse.json({ error: "Household mismatch." }, { status: 403 });
    }
    if (!canManageBilling(household.role)) {
      return NextResponse.json(
        { error: "Only a household owner or admin can manage billing." },
        { status: 403 },
      );
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("household_id", household.id)
      .maybeSingle<{ stripe_customer_id: string }>();

    if (error) throw error;
    if (!data?.stripe_customer_id) {
      return NextResponse.json({ error: "No Stripe customer exists yet." }, { status: 400 });
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${getSiteUrl()}/app/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create portal session." },
      { status: 400 },
    );
  }
}
