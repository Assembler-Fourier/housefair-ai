import { NextResponse } from "next/server";
import { z } from "zod";
import {
  auditLog,
  authenticateDevice,
  parseJson,
  rateLimit,
} from "@/lib/server/security";
import { insertRow, isPostgresConfigured } from "@/lib/server/db";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { Complaint } from "@/lib/types";

export const runtime = "nodejs";

const complaintSchema = z.object({
  person_involved: z.string(),
  location: z.string().min(1),
  issue_type: z.enum(["report", "cleanup_request", "reminder"]).default("report"),
  category: z.enum([
    "Dirty dishes",
    "Kitchen mess",
    "Bathroom mess",
    "Trash issue",
    "Noise",
    "Guest issue",
    "Missed task",
    "Other",
  ]),
  description: z.string().min(3),
  image_url: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  const limited = rateLimit(request, "complaints", 4, 60 * 60 * 1000);
  if (limited) return limited;

  const auth = await authenticateDevice(request);
  if (auth.response) return auth.response;

  const parsed = await parseJson(request, complaintSchema);
  if (parsed.response) return parsed.response;

  const input = parsed.data;
  const complaint = {
    id: crypto.randomUUID(),
    ...input,
    reporter: auth.session.personId,
    image_url: input.image_url ?? null,
    date: new Date().toISOString().slice(0, 10),
    status: "open",
    confirm_votes: 0,
    reject_votes: 0,
    created_at: new Date().toISOString(),
  };

  if (isPostgresConfigured()) {
    const data = await insertRow<Complaint>("complaints", {
      ...input,
      reporter: auth.session.personId,
      image_url: input.image_url ?? null,
    });

    if (!data) {
      return NextResponse.json({ error: "Complaint could not be saved." }, { status: 500 });
    }

    await insertRow("notifications", {
      recipient: input.person_involved,
      title: "New house issue",
      body:
        input.issue_type === "cleanup_request"
          ? "A housemate requested cleanup help."
          : input.issue_type === "reminder"
            ? "A housemate sent a gentle house reminder."
            : "A housemate reported an issue involving you.",
      type: "complaint",
      payload: { complaint_id: data.id },
    });

    await auditLog({
      personId: auth.session.personId,
      deviceId: auth.session.deviceId,
      action: "created_complaint",
      entityType: "complaint",
      entityId: data.id,
      metadata: { category: data.category, location: data.location, issue_type: data.issue_type },
    });

    return NextResponse.json({ complaint: data });
  }

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("complaints")
      .insert({
        ...input,
        reporter: auth.session.personId,
        image_url: input.image_url ?? null,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase.from("notifications").insert({
      recipient: input.person_involved,
      title: "New house issue",
      body:
        input.issue_type === "cleanup_request"
          ? "A housemate requested cleanup help."
          : input.issue_type === "reminder"
            ? "A housemate sent a gentle house reminder."
            : "A housemate reported an issue involving you.",
      type: "complaint",
      payload: { complaint_id: data.id },
    });

    await auditLog({
      personId: auth.session.personId,
      deviceId: auth.session.deviceId,
      action: "created_complaint",
      entityType: "complaint",
      entityId: data.id,
      metadata: { category: data.category, location: data.location, issue_type: data.issue_type },
    });

    return NextResponse.json({ complaint: data });
  }

  return NextResponse.json({ complaint });
}
