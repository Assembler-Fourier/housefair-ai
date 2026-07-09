import { NextResponse } from "next/server";
import { z } from "zod";
import { auditLog, authenticateDevice, parseJson, rateLimit } from "@/lib/server/security";
import { isPostgresConfigured, upsertRow } from "@/lib/server/db";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { ShoppingSession } from "@/lib/types";

export const runtime = "nodejs";

const shoppingSchema = z.object({
  is_active: z.boolean(),
});

export async function POST(request: Request) {
  const limited = rateLimit(request, "shopping-mode", 20, 10 * 60 * 1000);
  if (limited) return limited;

  const auth = await authenticateDevice(request);
  if (auth.response) return auth.response;

  const parsed = await parseJson(request, shoppingSchema);
  if (parsed.response) return parsed.response;

  const now = new Date().toISOString();
  const values = {
    user_id: auth.session.personId,
    is_active: parsed.data.is_active,
    started_at: parsed.data.is_active ? now : null,
    ended_at: parsed.data.is_active ? null : now,
    updated_at: now,
  };

  if (isPostgresConfigured()) {
    const session = await upsertRow<ShoppingSession>("shopping_sessions", values, ["user_id"]);
    await auditLog({
      personId: auth.session.personId,
      deviceId: auth.session.deviceId,
      action: parsed.data.is_active ? "started_shopping" : "finished_shopping",
      entityType: "shopping_session",
      entityId: session?.id ?? null,
    });
    return NextResponse.json({ session });
  }

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("shopping_sessions")
      .upsert(values, { onConflict: "user_id" })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await auditLog({
      personId: auth.session.personId,
      deviceId: auth.session.deviceId,
      action: parsed.data.is_active ? "started_shopping" : "finished_shopping",
      entityType: "shopping_session",
      entityId: data.id,
    });

    return NextResponse.json({ session: data });
  }

  return NextResponse.json({ session: values });
}
