import { NextResponse } from "next/server";
import { dbQueryOne } from "@/lib/server/db";
import { isFreeLaunch } from "@/lib/saas/access";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const database = await dbQueryOne<{ ok: number }>("select 1 as ok");
    return NextResponse.json({
      status: database?.ok === 1 ? "ok" : "degraded",
      database: database?.ok === 1 ? "connected" : "unavailable",
      access: isFreeLaunch() ? "free_early_access" : "paid",
      checked_at: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { status: "degraded", database: "unavailable", checked_at: new Date().toISOString() },
      { status: 503 },
    );
  }
}

