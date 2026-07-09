import { HouseFairApp } from "@/components/housefair-app";
import { getHouseState } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const state = await getHouseState();
  return <HouseFairApp initialState={state} />;
}
