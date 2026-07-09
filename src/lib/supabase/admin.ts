import "server-only";

import { createAdminClient } from "@supabase/server/core";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

export function getSupabaseUrl() {
  return process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
}

function getSupabaseAdminKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY ??
    null
  );
}

export function isSupabaseConfigured() {
  return Boolean(getSupabaseUrl() && getSupabaseAdminKey());
}

export function getSupabaseAdmin() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  if (!adminClient) {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY) {
      adminClient = createAdminClient() as SupabaseClient;
    } else {
      adminClient = createClient(getSupabaseUrl()!, getSupabaseAdminKey()!, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    }
  }

  return adminClient;
}

export function getPublicStorageUrl(bucket: string, path: string) {
  const url = getSupabaseUrl();
  if (!url) return null;
  const base = url.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}
