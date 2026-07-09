import { NextResponse } from "next/server";
import { generateFairWeeklyPlan } from "@/lib/fairness-engine";
import { getHouseState } from "@/lib/data";
import {
  auditLog,
  authenticateDevice,
  rateLimit,
} from "@/lib/server/security";
import { insertRow, isPostgresConfigured } from "@/lib/server/db";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { HouseState, WeeklyPlan } from "@/lib/types";

export const runtime = "nodejs";

function extractResponseText(data: unknown) {
  if (
    data &&
    typeof data === "object" &&
    "output_text" in data &&
    typeof data.output_text === "string"
  ) {
    return data.output_text;
  }

  const output = (data as { output?: Array<{ content?: Array<{ text?: string }> }> })
    ?.output;
  return output
    ?.flatMap((item) => item.content ?? [])
    .map((item) => item.text)
    .filter(Boolean)
    .join("\n");
}

async function refineWithModel(seed: WeeklyPlan, state: HouseState) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;

  if (!apiKey || !model) return null;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content:
            "You are HouseFair AI Manager. Produce fair roommate cleaning plans. Never make permanent assignments. Respect that Sheraz must not clean the top floor bathroom. Return compact JSON only.",
        },
        {
          role: "user",
          content: JSON.stringify({
            seed_plan: seed,
            house_state: {
              users: state.users,
              tasks: state.tasks,
              task_history: state.task_history,
              complaints: state.complaints,
              groceries: state.groceries,
              availability: state.availability,
              expenses: state.expenses,
              settlements: state.settlements,
              rewards: state.rewards,
              guest_status: state.guest_status,
            },
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "housefair_weekly_plan",
          schema: {
            type: "object",
            additionalProperties: false,
            required: [
              "title",
              "generated_at",
              "summary",
              "assignments",
              "fairness_notes",
              "reminders",
              "grocery_predictions",
              "cleanliness_scores",
            ],
            properties: {
              title: { type: "string" },
              generated_at: { type: "string" },
              summary: { type: "string" },
              assignments: { type: "array", items: { type: "object" } },
              fairness_notes: { type: "array", items: { type: "string" } },
              reminders: { type: "array", items: { type: "string" } },
              grocery_predictions: { type: "array", items: { type: "object" } },
              cleanliness_scores: { type: "array", items: { type: "object" } },
            },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    console.error("OpenAI weekly-plan request failed", await response.text());
    return null;
  }

  const text = extractResponseText(await response.json());
  if (!text) return null;

  try {
    return JSON.parse(text) as WeeklyPlan;
  } catch (error) {
    console.error("Could not parse model weekly plan", error);
    return null;
  }
}

export async function POST(request: Request) {
  const limited = rateLimit(request, "ai-weekly-plan", 5, 60 * 60 * 1000);
  if (limited) return limited;

  const auth = await authenticateDevice(request);
  if (auth.response) return auth.response;

  const state = await getHouseState();
  const seed = generateFairWeeklyPlan(state);
  const refined = await refineWithModel(seed, state);
  const plan = refined ?? seed;

  if (isPostgresConfigured()) {
    await insertRow("ai_recommendations", {
      type: "weekly_plan",
      title: plan.title,
      summary: plan.summary,
      recommendation: plan,
      status: "draft",
      generated_by: auth.session.personId,
    });

    await insertRow("notifications", {
      recipient: null,
      title: "New fair weekly plan",
      body: "New fair weekly cleaning plan is ready.",
      type: "ai",
      payload: { plan_title: plan.title },
    });

    await auditLog({
      personId: auth.session.personId,
      deviceId: auth.session.deviceId,
      action: "generated_ai_weekly_plan",
      entityType: "ai_recommendation",
      metadata: { source: refined ? "model" : "fairness-engine" },
    });
  } else if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    await supabase.from("ai_recommendations").insert({
      type: "weekly_plan",
      title: plan.title,
      summary: plan.summary,
      recommendation: plan,
      status: "draft",
      generated_by: auth.session.personId,
    });

    await supabase.from("notifications").insert({
      recipient: null,
      title: "New fair weekly plan",
      body: "New fair weekly cleaning plan is ready.",
      type: "ai",
      payload: { plan_title: plan.title },
    });

    await auditLog({
      personId: auth.session.personId,
      deviceId: auth.session.deviceId,
      action: "generated_ai_weekly_plan",
      entityType: "ai_recommendation",
      metadata: { source: refined ? "model" : "fairness-engine" },
    });
  }

  return NextResponse.json({
    plan,
    source: refined ? "model" : "fairness-engine",
  });
}
