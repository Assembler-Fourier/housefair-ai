import { NextResponse } from "next/server";
import webpush from "web-push";
import { z } from "zod";
import { parseJson } from "@/lib/server/security";
import { dbQuery, insertRow, isPostgresConfigured } from "@/lib/server/db";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const sendSchema = z.object({
  userId: z.string().nullable().optional(),
  title: z.string().min(1),
  body: z.string().min(1),
  url: z.string().optional(),
  type: z.enum(["task", "complaint", "ai", "grocery", "system"]).default("system"),
});

function configureWebPush() {
  if (
    !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    !process.env.VAPID_PRIVATE_KEY ||
    !process.env.VAPID_SUBJECT
  ) {
    return false;
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
  return true;
}

function isAuthorizedCronRequest(request: Request) {
  const secret = process.env.CRON_SECRET ?? process.env.HOUSEFAIR_CRON_SECRET;
  if (!secret) return false;

  const bearer = request.headers.get("authorization");
  const key = request.headers.get("x-housefair-cron-key");
  return bearer === `Bearer ${secret}` || key === secret;
}

export async function POST(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const parsed = await parseJson(request, sendSchema);
  if (parsed.response) return parsed.response;

  const input = parsed.data;

  if ((!isSupabaseConfigured() && !isPostgresConfigured()) || !configureWebPush()) {
    return NextResponse.json({ ok: true, sent: 0, skipped: true });
  }

  const data = isPostgresConfigured()
    ? await dbQuery<{
        endpoint: string;
        p256dh: string;
        auth: string;
      }>(
        input.userId
          ? "select * from public.push_subscriptions where user_id = $1"
          : "select * from public.push_subscriptions",
        input.userId ? [input.userId] : [],
      )
    : null;

  let subscriptions = data;

  if (!subscriptions) {
    const supabase = getSupabaseAdmin();
    const query = supabase.from("push_subscriptions").select("*");
    const { data: rows, error } = input.userId
      ? await query.eq("user_id", input.userId)
      : await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    subscriptions = rows ?? [];
  }

  const payload = JSON.stringify({
    title: input.title,
    body: input.body,
    url: input.url ?? "/",
    icon: "/icons/icon-192.png",
    tag: input.type,
  });

  const results = await Promise.allSettled(
    subscriptions.map((subscription) =>
      webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        payload,
      ),
    ),
  );

  const notification = {
    recipient: input.userId ?? null,
    title: input.title,
    body: input.body,
    type: input.type,
    payload: { sent: results.filter((item) => item.status === "fulfilled").length },
  };

  if (isPostgresConfigured()) {
    await insertRow("notifications", notification);
  } else {
    const supabase = getSupabaseAdmin();
    await supabase.from("notifications").insert(notification);
  }

  return NextResponse.json({
    ok: true,
    sent: results.filter((item) => item.status === "fulfilled").length,
    failed: results.filter((item) => item.status === "rejected").length,
  });
}
