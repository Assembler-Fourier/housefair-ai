import { NextResponse } from "next/server";
import { z } from "zod";
import { auditLog, authenticateDevice, parseJson, rateLimit } from "@/lib/server/security";
import { insertRow, isPostgresConfigured } from "@/lib/server/db";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { Settlement } from "@/lib/types";

export const runtime = "nodejs";

const settlementSchema = z.object({
  payer: z.string().min(8),
  receiver: z.string().min(8),
  amount: z.coerce.number().positive(),
  method: z.enum(["cash", "bank_transfer", "other"]),
  notes: z.string().max(500).nullable().optional(),
  settled_at: z.string().min(8).optional(),
});

export async function POST(request: Request) {
  const limited = rateLimit(request, "money-settlements", 20, 10 * 60 * 1000);
  if (limited) return limited;

  const auth = await authenticateDevice(request);
  if (auth.response) return auth.response;

  const parsed = await parseJson(request, settlementSchema);
  if (parsed.response) return parsed.response;

  if (parsed.data.payer === parsed.data.receiver) {
    return NextResponse.json({ error: "Payer and receiver must be different." }, { status: 400 });
  }

  const values = {
    payer: parsed.data.payer,
    receiver: parsed.data.receiver,
    amount: parsed.data.amount,
    method: parsed.data.method,
    notes: parsed.data.notes ?? null,
    settled_at: parsed.data.settled_at ?? new Date().toISOString().slice(0, 10),
  };

  if (!isSupabaseConfigured() && !isPostgresConfigured()) {
    return NextResponse.json({
      settlement: {
        id: crypto.randomUUID(),
        ...values,
        created_at: new Date().toISOString(),
      },
    });
  }

  if (isPostgresConfigured()) {
    const settlement = await insertRow<Settlement>("settlements", values);
    await auditLog({
      personId: auth.session.personId,
      deviceId: auth.session.deviceId,
      action: "created_settlement",
      entityType: "settlement",
      entityId: settlement?.id ?? null,
      metadata: { amount: values.amount, method: values.method },
    });
    return NextResponse.json({ settlement });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("settlements")
    .insert(values)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await auditLog({
    personId: auth.session.personId,
    deviceId: auth.session.deviceId,
    action: "created_settlement",
    entityType: "settlement",
    entityId: data.id,
    metadata: { amount: values.amount, method: values.method },
  });

  return NextResponse.json({ settlement: data });
}
