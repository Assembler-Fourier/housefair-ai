import { NextResponse } from "next/server";
import { z } from "zod";
import { auditLog, authenticateDevice, parseJson, rateLimit } from "@/lib/server/security";
import { insertRow, isPostgresConfigured } from "@/lib/server/db";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { HouseAnnouncement } from "@/lib/types";

export const runtime = "nodejs";

const announcementSchema = z.object({
  title: z.string().min(2).max(80),
  body: z.string().min(2).max(500),
  category: z.enum(["guests", "repairs", "message"]).default("message"),
});

export async function POST(request: Request) {
  const limited = rateLimit(request, "house-announcements", 10, 10 * 60 * 1000);
  if (limited) return limited;

  const auth = await authenticateDevice(request);
  if (auth.response) return auth.response;

  const parsed = await parseJson(request, announcementSchema);
  if (parsed.response) return parsed.response;

  const values = {
    ...parsed.data,
    author: auth.session.personId,
    active: true,
  };

  if (isPostgresConfigured()) {
    const announcement = await insertRow<HouseAnnouncement>("house_announcements", values);
    await auditLog({
      personId: auth.session.personId,
      deviceId: auth.session.deviceId,
      action: "created_announcement",
      entityType: "house_announcement",
      entityId: announcement?.id ?? null,
      metadata: { title: parsed.data.title, category: parsed.data.category },
    });
    return NextResponse.json({ announcement });
  }

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("house_announcements")
      .insert(values)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await auditLog({
      personId: auth.session.personId,
      deviceId: auth.session.deviceId,
      action: "created_announcement",
      entityType: "house_announcement",
      entityId: data.id,
      metadata: { title: parsed.data.title, category: parsed.data.category },
    });

    return NextResponse.json({ announcement: data });
  }

  return NextResponse.json({
    announcement: {
      id: crypto.randomUUID(),
      ...values,
      created_at: new Date().toISOString(),
    },
  });
}
