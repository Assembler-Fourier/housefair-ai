import { requireHousehold } from "@/lib/saas/auth";
import { getHouseholdAppData } from "@/lib/saas/core";
import { SettingsClient } from "@/app/app/settings/settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { user, household } = await requireHousehold({ allowUnpaid: true });
  const data = await getHouseholdAppData({ household, profileId: user.id });
  return <SettingsClient email={user.email ?? null} household={household} members={data.members} />;
}
