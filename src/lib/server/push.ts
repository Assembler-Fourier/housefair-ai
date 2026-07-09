import "server-only";

import webpush from "web-push";
import { dbQuery, isPostgresConfigured } from "@/lib/server/db";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

type PushSubscriptionRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

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

export async function sendPushToUser(userId: string | null, payload: PushPayload) {
  if ((!isSupabaseConfigured() && !isPostgresConfigured()) || !configureWebPush()) {
    return { sent: 0, failed: 0, skipped: true };
  }

  let subscriptions: PushSubscriptionRow[] = [];
  if (isPostgresConfigured()) {
    subscriptions = await dbQuery<PushSubscriptionRow>(
      userId
        ? "select endpoint, p256dh, auth from public.push_subscriptions where user_id = $1"
        : "select endpoint, p256dh, auth from public.push_subscriptions",
      userId ? [userId] : [],
    );
  } else {
    const supabase = getSupabaseAdmin();
    const query = supabase.from("push_subscriptions").select("endpoint,p256dh,auth");
    const { data } = userId ? await query.eq("user_id", userId) : await query;
    subscriptions = (data ?? []) as PushSubscriptionRow[];
  }

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/",
    icon: "/icons/icon-192.png",
    tag: payload.tag ?? "housefair",
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
        body,
      ),
    ),
  );

  return {
    sent: results.filter((item) => item.status === "fulfilled").length,
    failed: results.filter((item) => item.status === "rejected").length,
    skipped: false,
  };
}
