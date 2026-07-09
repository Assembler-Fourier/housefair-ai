import { NextResponse } from "next/server";
import { z } from "zod";
import {
  auditLog,
  jsonError,
  parseJson,
  rateLimit,
  registerDevice,
} from "@/lib/server/security";
import { isPostgresConfigured, upsertRow } from "@/lib/server/db";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const registerSchema = z.object({
  personId: z.string().min(1),
  pin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits."),
  taskStyle: z.enum(["heavy", "light", "weekend", "evening"]).default("evening"),
});

export async function POST(request: Request) {
  const limited = rateLimit(request, "device-register", 6, 10 * 60 * 1000);
  if (limited) return limited;

  const parsed = await parseJson(request, registerSchema);
  if (parsed.response) return parsed.response;

  try {
    const session = await registerDevice(parsed.data);
    const preference = {
      user_id: session.personId,
      task_style: parsed.data.taskStyle,
      updated_at: new Date().toISOString(),
    };
    if (isPostgresConfigured()) {
      await upsertRow("user_preferences", preference, ["user_id"]);
    } else if (isSupabaseConfigured()) {
      await getSupabaseAdmin().from("user_preferences").upsert(preference, {
        onConflict: "user_id",
      });
    }
    await auditLog({
      personId: session.personId,
      deviceId: session.deviceId,
      action: "registered_device",
      entityType: "user_device",
      entityId: session.deviceId,
      metadata: { task_style: parsed.data.taskStyle },
    });
    return NextResponse.json(session);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Device registration failed.");
  }
}
