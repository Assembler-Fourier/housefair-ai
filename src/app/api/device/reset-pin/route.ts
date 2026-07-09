import { NextResponse } from "next/server";
import { z } from "zod";
import {
  auditLog,
  jsonError,
  parseJson,
  rateLimit,
  resetDevicePin,
} from "@/lib/server/security";

export const runtime = "nodejs";

const resetPinSchema = z.object({
  deviceId: z.string().min(8),
  currentPin: z.string().regex(/^\d{4}$/, "Current PIN must be exactly 4 digits."),
  newPin: z.string().regex(/^\d{4}$/, "New PIN must be exactly 4 digits."),
});

export async function POST(request: Request) {
  const limited = rateLimit(request, "device-reset-pin", 5, 10 * 60 * 1000);
  if (limited) return limited;

  const parsed = await parseJson(request, resetPinSchema);
  if (parsed.response) return parsed.response;

  try {
    const session = await resetDevicePin(parsed.data);
    await auditLog({
      personId: session.personId,
      deviceId: session.deviceId,
      action: "reset_pin",
      entityType: "user_device",
      entityId: session.deviceId,
    });
    return NextResponse.json(session);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "PIN reset failed.", 401);
  }
}
