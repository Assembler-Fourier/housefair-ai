import { NextResponse } from "next/server";
import { z } from "zod";
import { auditLog, authenticateDevice, parseJson, rateLimit } from "@/lib/server/security";

export const runtime = "nodejs";

const receiptSchema = z.object({
  image_url: z.string().min(1),
  amount_hint: z.coerce.number().nullable().optional(),
  title_hint: z.string().nullable().optional(),
});

function inferCategory(title: string | null | undefined) {
  const text = (title ?? "").toLowerCase();
  if (/(milk|bread|egg|chicken|naan|food|grocery|tesco|aldi|lidl)/.test(text)) return "Food";
  if (/(sponge|clean|spray|wash|powder|bags|tissue)/.test(text)) return "Cleaning";
  if (/(electric|power)/.test(text)) return "Electricity";
  if (/(internet|wifi|broadband)/.test(text)) return "Internet";
  return "Other";
}

export async function POST(request: Request) {
  const limited = rateLimit(request, "receipt-scan", 15, 10 * 60 * 1000);
  if (limited) return limited;

  const auth = await authenticateDevice(request);
  if (auth.response) return auth.response;

  const parsed = await parseJson(request, receiptSchema);
  if (parsed.response) return parsed.response;

  const category = inferCategory(parsed.data.title_hint);
  const result = {
    store: parsed.data.title_hint?.split(" ").slice(0, 3).join(" ") ?? "Receipt",
    items: [],
    amount: parsed.data.amount_hint ?? null,
    category,
    confidence: parsed.data.amount_hint ? 72 : 48,
    recommendation:
      "AI receipt scanner is a recommendation only. Check the amount and category before saving.",
  };

  await auditLog({
    personId: auth.session.personId,
    deviceId: auth.session.deviceId,
    action: "scanned_receipt",
    entityType: "receipt",
    metadata: { category, confidence: result.confidence },
  });

  return NextResponse.json({ receipt: result });
}
