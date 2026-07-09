import { NextResponse } from "next/server";
import { z } from "zod";
import {
  auditLog,
  authenticateDevice,
  parseJson,
} from "@/lib/server/security";
import {
  dbQuery,
  isPostgresConfigured,
  updateRows,
  upsertRow,
} from "@/lib/server/db";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { ComplaintVote } from "@/lib/types";

export const runtime = "nodejs";

const voteSchema = z.object({
  complaintId: z.string(),
  supports_complaint: z.boolean(),
});

export async function POST(request: Request) {
  const auth = await authenticateDevice(request);
  if (auth.response) return auth.response;

  const parsed = await parseJson(request, voteSchema);
  if (parsed.response) return parsed.response;

  const input = parsed.data;

  if (!isSupabaseConfigured() && !isPostgresConfigured()) {
    return NextResponse.json({
      ok: true,
      vote: {
        id: crypto.randomUUID(),
        ...input,
        voter: auth.session.personId,
        created_at: new Date().toISOString(),
      },
    });
  }

  if (isPostgresConfigured()) {
    await upsertRow("complaint_votes", {
      complaint_id: input.complaintId,
      voter: auth.session.personId,
      supports_complaint: input.supports_complaint,
    }, ["complaint_id", "voter"]);

    const votes = await dbQuery<ComplaintVote>(
      "select * from public.complaint_votes where complaint_id = $1",
      [input.complaintId],
    );
    const confirm = votes.filter((vote) => vote.supports_complaint).length;
    const reject = votes.length - confirm;
    const status = confirm >= 3 ? "confirmed" : reject >= 3 ? "rejected" : "disputed";

    await updateRows("complaints", {
      confirm_votes: confirm,
      reject_votes: reject,
      status,
    }, "id = $1", [input.complaintId]);

    await auditLog({
      personId: auth.session.personId,
      deviceId: auth.session.deviceId,
      action: "voted_complaint",
      entityType: "complaint",
      entityId: input.complaintId,
      metadata: { supports: input.supports_complaint, status },
    });

    return NextResponse.json({ ok: true, confirm, reject, status });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("complaint_votes").upsert(
    {
      complaint_id: input.complaintId,
      voter: auth.session.personId,
      supports_complaint: input.supports_complaint,
    },
    { onConflict: "complaint_id,voter" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: votes, error: voteError } = await supabase
    .from("complaint_votes")
    .select("*")
    .eq("complaint_id", input.complaintId);

  if (voteError) {
    return NextResponse.json({ error: voteError.message }, { status: 500 });
  }

  const confirm = votes.filter((vote) => vote.supports_complaint).length;
  const reject = votes.length - confirm;
  const status = confirm >= 3 ? "confirmed" : reject >= 3 ? "rejected" : "disputed";

  await supabase
    .from("complaints")
    .update({
      confirm_votes: confirm,
      reject_votes: reject,
      status,
    })
    .eq("id", input.complaintId);

  await auditLog({
    personId: auth.session.personId,
    deviceId: auth.session.deviceId,
    action: "voted_complaint",
    entityType: "complaint",
    entityId: input.complaintId,
    metadata: { supports: input.supports_complaint, status },
  });

  return NextResponse.json({ ok: true, confirm, reject, status });
}
