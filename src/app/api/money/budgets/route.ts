import { NextResponse } from "next/server";
import { z } from "zod";
import { auditLog, authenticateDevice, parseJson, rateLimit } from "@/lib/server/security";
import { isPostgresConfigured, upsertRow } from "@/lib/server/db";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { Budget } from "@/lib/types";

export const runtime = "nodejs";

const budgetSchema = z.object({
  category: z.enum([
    "Food",
    "Cleaning",
    "Bills",
    "Internet",
    "Electricity",
    "Transport",
    "Entertainment",
    "Emergency",
    "Other",
  ]),
  monthly_limit: z.coerce.number().min(0),
});

export async function POST(request: Request) {
  const limited = rateLimit(request, "money-budgets", 20, 10 * 60 * 1000);
  if (limited) return limited;

  const auth = await authenticateDevice(request);
  if (auth.response) return auth.response;

  const parsed = await parseJson(request, budgetSchema);
  if (parsed.response) return parsed.response;

  const values = {
    category: parsed.data.category,
    monthly_limit: parsed.data.monthly_limit,
    created_by: auth.session.personId,
    updated_at: new Date().toISOString(),
  };

  if (!isSupabaseConfigured() && !isPostgresConfigured()) {
    return NextResponse.json({
      budget: { id: crypto.randomUUID(), ...values, created_at: new Date().toISOString() },
    });
  }

  if (isPostgresConfigured()) {
    const budget = await upsertRow<Budget>("budgets", values, ["category"]);
    await auditLog({
      personId: auth.session.personId,
      deviceId: auth.session.deviceId,
      action: "updated_budget",
      entityType: "budget",
      entityId: budget?.id ?? null,
      metadata: { category: values.category, monthly_limit: values.monthly_limit },
    });
    return NextResponse.json({ budget });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("budgets")
    .upsert(values, { onConflict: "category" })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await auditLog({
    personId: auth.session.personId,
    deviceId: auth.session.deviceId,
    action: "updated_budget",
    entityType: "budget",
    entityId: data.id,
    metadata: { category: values.category, monthly_limit: values.monthly_limit },
  });

  return NextResponse.json({ budget: data });
}
