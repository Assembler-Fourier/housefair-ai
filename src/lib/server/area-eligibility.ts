import "server-only";

import { createSeedHouseState } from "@/lib/house-data";
import { dbQueryOne, isPostgresConfigured } from "@/lib/server/db";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export async function getUserDisplayName(userId: string) {
  const seedUser = createSeedHouseState().users.find((item) => item.id === userId);

  if (isPostgresConfigured()) {
    const data = await dbQueryOne<{ name: string }>(
      "select name from public.users where id = $1 limit 1",
      [userId],
    );
    return data?.name ?? "A housemate";
  }

  if (seedUser || !isSupabaseConfigured()) return seedUser?.name ?? "A housemate";

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("users")
    .select("name")
    .eq("id", userId)
    .single();

  return (data?.name as string | undefined) ?? "A housemate";
}

export async function getExcludedMembersForArea(location: string) {
  const seedArea = createSeedHouseState().areas.find((area) => area.name === location);

  if (isPostgresConfigured()) {
    const data = await dbQueryOne<{ excluded_members: string[] }>(
      "select excluded_members from public.areas where name = $1 limit 1",
      [location],
    );
    return data?.excluded_members ?? [];
  }

  if (seedArea || !isSupabaseConfigured()) return seedArea?.excluded_members ?? [];

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("areas")
    .select("excluded_members")
    .eq("name", location)
    .single();

  return ((data?.excluded_members as string[] | undefined) ?? []);
}

export async function areaEligibilityForUser(userId: string, location: string) {
  const [userName, excludedMembers] = await Promise.all([
    getUserDisplayName(userId),
    getExcludedMembersForArea(location),
  ]);

  return {
    userName,
    excludedMembers,
    isExcluded: excludedMembers.includes(userName),
  };
}
