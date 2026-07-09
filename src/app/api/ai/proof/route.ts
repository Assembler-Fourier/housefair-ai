import { NextResponse } from "next/server";
import { z } from "zod";
import { createProofRecommendation } from "@/lib/fairness-engine";
import { authenticateDevice, parseJson, rateLimit } from "@/lib/server/security";
import type { Task } from "@/lib/types";

export const runtime = "nodejs";

const proofSchema = z.object({
  task: z.custom<Task>().optional(),
  beforeUrl: z.string().nullable().optional(),
  afterUrl: z.string().nullable().optional(),
  area: z.string().nullable().optional(),
});

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

async function analyzeWithModel(input: z.infer<typeof proofSchema>) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;

  if (!apiKey || !model || !input.beforeUrl || !input.afterUrl) return null;

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
            "You are HouseFair AI Manager. Review cleaning proof gently. Return JSON with status accepted or needs_clearer_proof, feedback exactly either Proof accepted or Please upload clearer proof, and confidence 0-100. Do not punish users.",
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify({
                task: input.task,
                claimed_area: input.area,
              }),
            },
            { type: "input_image", image_url: input.beforeUrl },
            { type: "input_image", image_url: input.afterUrl },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "proof_review",
          schema: {
            type: "object",
            additionalProperties: false,
            required: [
              "status",
              "feedback",
              "confidence",
              "cleanlinessImprovementScore",
              "recommendation",
            ],
            properties: {
              status: {
                type: "string",
                enum: ["accepted", "needs_clearer_proof"],
              },
              feedback: {
                type: "string",
                enum: ["Proof accepted", "Please upload clearer proof"],
              },
              confidence: { type: "number" },
              cleanlinessImprovementScore: { type: "number" },
              recommendation: { type: "string" },
            },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    console.error("OpenAI proof request failed", await response.text());
    return null;
  }

  const text = extractResponseText(await response.json());
  if (!text) return null;

  try {
    return JSON.parse(text) as ReturnType<typeof createProofRecommendation>;
  } catch (error) {
    console.error("Could not parse proof review", error);
    return null;
  }
}

export async function POST(request: Request) {
  const limited = rateLimit(request, "ai-proof", 20, 10 * 60 * 1000);
  if (limited) return limited;

  const auth = await authenticateDevice(request);
  if (auth.response) return auth.response;

  const parsed = await parseJson(request, proofSchema);
  if (parsed.response) return parsed.response;

  const input = parsed.data;
  const modelResult = await analyzeWithModel(input);
  const fallback = createProofRecommendation(input);

  return NextResponse.json({
    result: modelResult ?? fallback,
    source: modelResult ? "model" : "heuristic",
    review_mode: modelResult ? "vision_model" : "rule_based",
    vision_model_ready: Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL),
    recommendation_only: true,
  });
}
