import "server-only";

import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { dbQueryOne, isPostgresConfigured, upsertRow } from "@/lib/server/db";
import { isFreeLaunch } from "@/lib/saas/access";

export type HouseholdRole = "owner" | "admin" | "member";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired";

export type HouseholdContext = {
  id: string;
  name: string;
  slug: string | null;
  currency: string;
  timezone: string;
  memberLimit: number;
  role: HouseholdRole;
  subscription: {
    status: SubscriptionStatus | null;
    currentPeriodEnd: string | null;
    trialEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
};

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireUser(redirectTo = "/auth") {
  const user = await getCurrentUser();
  if (!user) redirect(redirectTo);
  return user;
}

export function subscriptionAllowsAccess(subscription: HouseholdContext["subscription"]) {
  if (isFreeLaunch()) return true;
  if (!subscription?.status) return false;
  if (subscription.status === "trialing" || subscription.status === "active") return true;
  if (subscription.status !== "past_due") return false;

  const periodEnd = subscription.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).getTime()
    : 0;
  if (!periodEnd) return false;
  return Date.now() <= periodEnd + 3 * 24 * 60 * 60 * 1000;
}

export function canManageBilling(role: HouseholdRole) {
  return role === "owner" || role === "admin";
}

export async function ensureProfile(user: User) {
  if (!isPostgresConfigured()) return;
  await upsertRow("profiles", {
    id: user.id,
    email: user.email ?? null,
    full_name:
      (user.user_metadata?.full_name as string | undefined) ??
      user.email?.split("@")[0] ??
      "HouseFair user",
    avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null,
    updated_at: new Date().toISOString(),
  }, ["id"]);
}

export async function getPrimaryHousehold(userId: string): Promise<HouseholdContext | null> {
  if (!isPostgresConfigured()) return null;

  const row = await dbQueryOne<{
    role: HouseholdRole;
    id: string;
    name: string;
    slug: string | null;
    currency: string;
    timezone: string;
    member_limit: number;
    subscription_status: SubscriptionStatus | null;
    current_period_end: string | null;
    trial_end: string | null;
    cancel_at_period_end: boolean | null;
  }>(
    `select hm.role, h.id, h.name, h.slug, h.currency, h.timezone, h.member_limit,
            s.status as subscription_status, s.current_period_end, s.trial_end,
            s.cancel_at_period_end
       from public.household_members hm
       join public.households h on h.id = hm.household_id
       left join public.subscriptions s on s.household_id = h.id
      where hm.profile_id = $1 and hm.status = 'active'
      order by hm.created_at asc
      limit 1`,
    [userId],
  );
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    currency: row.currency,
    timezone: row.timezone,
    memberLimit: row.member_limit,
    role: row.role,
    subscription: row.subscription_status
      ? {
          status: row.subscription_status,
          currentPeriodEnd: row.current_period_end,
          trialEnd: row.trial_end,
          cancelAtPeriodEnd: row.cancel_at_period_end ?? false,
        }
      : null,
  };
}

export async function requireHousehold(options?: {
  allowUnpaid?: boolean;
  redirectUnauthedTo?: string;
}) {
  const user = await requireUser(options?.redirectUnauthedTo);
  await ensureProfile(user);
  const household = await getPrimaryHousehold(user.id);

  if (!household) redirect("/onboarding");
  if (!options?.allowUnpaid && !subscriptionAllowsAccess(household.subscription)) {
    redirect("/app/paywall");
  }

  return { user, household };
}
