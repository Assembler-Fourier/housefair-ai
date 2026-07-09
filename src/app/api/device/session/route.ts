import { NextResponse } from "next/server";
import { authenticateDevice, rateLimit } from "@/lib/server/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const limited = rateLimit(request, "device-session", 30, 10 * 60 * 1000);
  if (limited) return limited;

  const auth = await authenticateDevice(request);
  if (auth.response) return auth.response;

  return NextResponse.json({ ok: true, session: auth.session });
}
