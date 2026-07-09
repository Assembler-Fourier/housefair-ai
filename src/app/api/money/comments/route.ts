import { NextResponse } from "next/server";
import { z } from "zod";
import { auditLog, authenticateDevice, parseJson, rateLimit } from "@/lib/server/security";
import { insertRow, isPostgresConfigured } from "@/lib/server/db";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { MoneyComment } from "@/lib/types";

export const runtime = "nodejs";

const commentSchema = z.object({
  expense_id: z.string().min(8),
  body: z.string().min(1).max(1000),
});

export async function POST(request: Request) {
  const limited = rateLimit(request, "money-comments", 30, 10 * 60 * 1000);
  if (limited) return limited;

  const auth = await authenticateDevice(request);
  if (auth.response) return auth.response;

  const parsed = await parseJson(request, commentSchema);
  if (parsed.response) return parsed.response;

  const values = {
    expense_id: parsed.data.expense_id,
    author: auth.session.personId,
    body: parsed.data.body,
  };

  if (!isSupabaseConfigured() && !isPostgresConfigured()) {
    return NextResponse.json({
      comment: {
        id: crypto.randomUUID(),
        ...values,
        created_at: new Date().toISOString(),
      },
    });
  }

  if (isPostgresConfigured()) {
    const comment = await insertRow<MoneyComment>("money_comments", values);
    await auditLog({
      personId: auth.session.personId,
      deviceId: auth.session.deviceId,
      action: "commented_expense",
      entityType: "expense",
      entityId: parsed.data.expense_id,
    });
    return NextResponse.json({ comment });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("money_comments")
    .insert(values)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await auditLog({
    personId: auth.session.personId,
    deviceId: auth.session.deviceId,
    action: "commented_expense",
    entityType: "expense",
    entityId: parsed.data.expense_id,
  });

  return NextResponse.json({ comment: data });
}
