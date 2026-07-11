import { requireHousehold } from "@/lib/saas/auth";
import { getHouseholdAppData } from "@/lib/saas/core";
import { HouseholdAppClient, type ActiveAppView } from "@/components/saas/household-app-client";

export async function HouseholdApp({ active }: { active: ActiveAppView }) {
  const { user, household } = await requireHousehold({ allowUnpaid: true });
  const data = await getHouseholdAppData({ household, profileId: user.id });
  return <HouseholdAppClient active={active} data={data} />;
}

