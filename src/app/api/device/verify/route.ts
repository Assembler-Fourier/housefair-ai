import { NextResponse } from "next/server";
import { z } from "zod";
import {
  auditLog,
  jsonError,
  parseJson,
  rateLimit,
  verifyDevicePin,
} from "@/lib/server/security";

export const runtime = "nodejs";

const verifySchema = z.object({
  deviceId: z.string().min(8),
  pin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits."),
});

export async function POST(request: Request) {
  const limited = rateLimit(request, "device-verify", 8, 10 * 60 * 1000);
  if (limited) return limited;

  const parsed = await parseJson(request, verifySchema);
  if (parsed.response) return parsed.response;

  try {
    const session = await verifyDevicePin(parsed.data);
    await auditLog({
      personId: session.personId,
      deviceId: session.deviceId,
      action: "verified_pin",
      entityType: "user_device",
      entityId: session.deviceId,
    });
    return NextResponse.json(session);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "PIN verification failed.", 401);
  }
}
