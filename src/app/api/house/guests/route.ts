import { NextResponse } from "next/server";
import { z } from "zod";
import { auditLog, authenticateDevice, parseJson, rateLimit } from "@/lib/server/security";
import { isPostgresConfigured, upsertRow } from "@/lib/server/db";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { GuestStatus } from "@/lib/types";

export const runtime = "nodejs";

const guestSchema = z.object({
  guest_staying: z.boolean(),
  guest_count: z.coerce.number().int().min(0).max(8),
  notes: z.string().max(300).nullable().optional(),
});

export async function POST(request: Request) {
  const limited = rateLimit(request, "guest-status", 20, 10 * 60 * 1000);
  if (limited) return limited;

  const auth = await authenticateDevice(request);
  if (auth.response) return auth.response;

  const parsed = await parseJson(request, guestSchema);
  if (parsed.response) return parsed.response;

  const values = {
    user_id: auth.session.personId,
    guest_staying: parsed.data.guest_staying,
    guest_count: parsed.data.guest_staying ? parsed.data.guest_count : 0,
    notes: parsed.data.notes ?? null,
    updated_at: new Date().toISOString(),
  };

  if (isPostgresConfigured()) {
    const guest = await upsertRow<GuestStatus>("guest_status", values, ["user_id"]);
    await auditLog({
      personId: auth.session.personId,
      deviceId: auth.session.deviceId,
      action: "updated_guest_status",
      entityType: "guest_status",
      entityId: guest?.id ?? null,
      metadata: {
        guest_staying: values.guest_staying,
        guest_count: values.guest_count,
      },
    });
    return NextResponse.json({ guest });
  }

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("guest_status")
      .upsert(values, { onConflict: "user_id" })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await auditLog({
      personId: auth.session.personId,
      deviceId: auth.session.deviceId,
      action: "updated_guest_status",
      entityType: "guest_status",
      entityId: data.id,
      metadata: {
        guest_staying: values.guest_staying,
        guest_count: values.guest_count,
      },
    });

    return NextResponse.json({ guest: data });
  }

  return NextResponse.json({
    guest: {
      id: crypto.randomUUID(),
      ...values,
      created_at: new Date().toISOString(),
    },
  });
}
