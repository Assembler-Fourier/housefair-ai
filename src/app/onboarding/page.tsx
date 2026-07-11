import { requireUser } from "@/lib/saas/auth";
import { OnboardingClient } from "@/app/onboarding/onboarding-client";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string | string[] }>;
}) {
  const user = await requireUser("/auth?next=/onboarding");
  const params = await searchParams;
  const invite = typeof params.invite === "string" ? params.invite : undefined;

  return <OnboardingClient email={user.email} initialInvite={invite} />;
}
