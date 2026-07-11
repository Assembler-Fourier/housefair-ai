import { HouseFairApp } from "@/components/housefair-app";
import { createSeedHouseState } from "@/lib/house-data";

export default function DemoPage() {
  return <HouseFairApp initialState={createSeedHouseState()} />;
}
