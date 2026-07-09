import { NextResponse } from "next/server";
import { z } from "zod";
import {
  auditLog,
  authenticateDevice,
  parseJson,
} from "@/lib/server/security";
import { isPostgresConfigured, upsertRow } from "@/lib/server/db";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const subscriptionSchema = z.object({
  subscription: z.object({
    endpoint: z.string(),
    expirationTime: z.number().nullable().optional(),
    keys: z.object({
      p256dh: z.string(),
      auth: z.string(),
    }),
  }),
});

export async function POST(request: Request) {
  const auth = await authenticateDevice(request);
  if (auth.response) return auth.response;

  const parsed = await parseJson(request, subscriptionSchema);
  if (parsed.response) return parsed.response;

  const input = parsed.data;

  if (!isSupabaseConfigured() && !isPostgresConfigured()) {
    return NextResponse.json({ ok: true, storage: "seed" });
  }

  if (isPostgresConfigured()) {
    await upsertRow("push_subscriptions", {
      user_id: auth.session.personId,
      endpoint: input.subscription.endpoint,
      p256dh: input.subscription.keys.p256dh,
      auth: input.subscription.keys.auth,
      expiration_time: input.subscription.expirationTime ?? null,
      updated_at: new Date().toISOString(),
    }, ["endpoint"]);

    await auditLog({
      personId: auth.session.personId,
      deviceId: auth.session.deviceId,
      action: "subscribed_push",
      entityType: "push_subscription",
      metadata: { endpoint: input.subscription.endpoint.slice(0, 40) },
    });

    return NextResponse.json({ ok: true, storage: "postgres" });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: auth.session.personId,
      endpoint: input.subscription.endpoint,
      p256dh: input.subscription.keys.p256dh,
      auth: input.subscription.keys.auth,
      expiration_time: input.subscription.expirationTime ?? null,
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await auditLog({
    personId: auth.session.personId,
    deviceId: auth.session.deviceId,
    action: "subscribed_push",
    entityType: "push_subscription",
    metadata: { endpoint: input.subscription.endpoint.slice(0, 40) },
  });

  return NextResponse.json({ ok: true, storage: "supabase" });
}
