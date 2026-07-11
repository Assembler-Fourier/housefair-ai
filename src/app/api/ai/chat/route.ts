import { NextResponse } from "next/server";
import { z } from "zod";
import { generateFairWeeklyPlan } from "@/lib/fairness-engine";
import { getHouseState } from "@/lib/data";
import { auditLog, authenticateDevice, parseJson, rateLimit } from "@/lib/server/security";

export const runtime = "nodejs";

const chatSchema = z.object({
  message: z.string().min(2).max(500),
});

function includesAny(message: string, terms: string[]) {
  return terms.some((term) => message.includes(term));
}

export async function POST(request: Request) {
  const limited = rateLimit(request, "ai-chat", 20, 60 * 60 * 1000);
  if (limited) return limited;

  const auth = await authenticateDevice(request);
  if (auth.response) return auth.response;

  const parsed = await parseJson(request, chatSchema);
  if (parsed.response) return parsed.response;

  const state = await getHouseState();
  const message = parsed.data.message.toLowerCase();
  const plan = generateFairWeeklyPlan(state);
  const guests = state.guest_status.filter((item) => item.guest_staying);
  const guestCount = guests.reduce((total, item) => total + item.guest_count, 0);
  const missingGroceries = state.groceries.filter((item) =>
    ["needed", "running_low"].includes(item.status),
  );
  const lowestWork = [...state.stats.weekly_rank].sort((a, b) => a.points - b.points)[0];
  const lowestUser = state.users.find((user) => user.id === lowestWork?.user_id);
  const bathroomPick = plan.assignments.find((item) =>
    item.location.toLowerCase().includes("bathroom"),
  );

  let answer =
    "I can help with bathrooms, groceries, least-work balance, guests, house issues, or a weekly plan. I only recommend; I never permanently assign or punish anyone.";
  let responsePlan = null;

  if (includesAny(message, ["weekly plan", "generate plan", "plan week"])) {
    answer =
      "Here is a draft weekly plan for review. It respects configured room and area eligibility rules and considers points, heavy-task history, issues, availability, and guests.";
    responsePlan = plan;
  } else if (includesAny(message, ["bathroom", "toilet", "sink", "mirror"])) {
    answer = bathroomPick
      ? `${state.users.find((user) => user.id === bathroomPick.assigned_to)?.name ?? "A housemate"} is the fairest bathroom recommendation right now for ${bathroomPick.location}. Reason: ${bathroomPick.reason}`
      : "I recommend assigning bathrooms to the eligible person with the lightest recent heavy-task load, using the house's configured bathroom rules.";
  } else if (includesAny(message, ["grocer", "missing", "shopping", "buy"])) {
    answer = missingGroceries.length
      ? `Groceries needing attention: ${missingGroceries.slice(0, 8).map((item) => `${item.name} (${item.status.replace("_", " ")})`).join(", ")}.`
      : "No groceries are currently marked needed or running low.";
  } else if (includesAny(message, ["least work", "least", "lowest", "behind"])) {
    answer = lowestUser
      ? `${lowestUser.name} currently has the lightest visible points load at ${lowestWork.points} points. Use this as context, not punishment.`
      : "There is not enough real task history yet to say who has done least work.";
  } else if (includesAny(message, ["guest", "guests", "staying"])) {
    answer =
      guestCount > 0
        ? `${guestCount} guest${guestCount === 1 ? "" : "s"} are marked as staying. I will treat that as extra kitchen, bathroom, and trash load in recommendations.`
        : "No guests are currently marked as staying.";
  } else if (includesAny(message, ["dish", "dishes", "kettle", "tea", "pan"])) {
    answer =
      "Personal plates, cups, and cutlery are personal responsibility. Dish duty is for shared mess: tea kettle, shared mugs, pans, cooking utensils, and dishes created while preparing food for multiple people.";
  }

  await auditLog({
    personId: auth.session.personId,
    deviceId: auth.session.deviceId,
    action: "asked_ai_chat",
    entityType: "ai_chat",
    metadata: { prompt: parsed.data.message.slice(0, 120), returned_plan: Boolean(responsePlan) },
  });

  return NextResponse.json({ answer, plan: responsePlan });
}
