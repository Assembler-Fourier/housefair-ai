import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, apiErrorResponse, getHouseholdApiContext } from "@/lib/saas/api";
import { rateLimit, validateImageFile } from "@/lib/server/security";
import { dbQueryOne, updateRows, upsertRow } from "@/lib/server/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const uploadSchema = z.object({
  kind: z.enum(["task_before", "task_after", "receipt", "issue"]),
  entity_id: z.string().uuid(),
});

function extensionFor(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/heic") return "heic";
  return "jpg";
}

export async function POST(request: Request) {
  const limited = rateLimit(request, "saas-uploads", 15, 60 * 60 * 1000);
  if (limited) return limited;

  try {
    const context = await getHouseholdApiContext();
    const form = await request.formData();
    const input = uploadSchema.parse({ kind: form.get("kind"), entity_id: form.get("entity_id") });
    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError("Choose an image to upload.", 400);
    const fileError = validateImageFile(file);
    if (fileError) throw new ApiError(fileError, 400);

    const table = input.kind.startsWith("task_") ? "household_tasks" : input.kind === "receipt" ? "household_expenses" : "household_issues";
    const target = await dbQueryOne<{ exists: boolean }>(
      `select exists(select 1 from public.${table} where id = $1 and household_id = $2) as exists`,
      [input.entity_id, context.household.id],
    );
    if (!target?.exists) throw new ApiError("Upload target not found.", 404);

    const path = `${context.household.id}/${input.kind}/${input.entity_id}/${crypto.randomUUID()}.${extensionFor(file)}`;
    const supabase = await createSupabaseServerClient();
    const { error: uploadError } = await supabase.storage
      .from("household-uploads")
      .upload(path, Buffer.from(await file.arrayBuffer()), {
        contentType: file.type,
        cacheControl: "31536000",
        upsert: false,
      });
    if (uploadError) throw uploadError;

    if (input.kind === "task_before" || input.kind === "task_after") {
      const column = input.kind === "task_before" ? "before_path" : "after_path";
      await upsertRow("household_task_proofs", {
          household_id: context.household.id,
          task_id: input.entity_id,
          uploaded_by_member_id: context.member.id,
          [column]: path,
          status: "pending",
          recommendation: "Proof saved. HouseFair AI reviews are recommendation-only.",
        }, ["task_id", "uploaded_by_member_id"]);
    } else {
      const column = input.kind === "receipt" ? "receipt_path" : "image_path";
      await updateRows(table, { [column]: path }, "id = $1 and household_id = $2", [input.entity_id, context.household.id]);
    }

    return NextResponse.json({ ok: true, path });
  } catch (error) {
    return apiErrorResponse(error, "api.app.uploads");
  }
}
