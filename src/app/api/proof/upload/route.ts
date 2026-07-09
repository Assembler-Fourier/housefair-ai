import { NextResponse } from "next/server";
import {
  auditLog,
  authenticateDevice,
  rateLimit,
  validateImageFile,
} from "@/lib/server/security";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const limited = rateLimit(request, "proof-upload", 10, 10 * 60 * 1000);
  if (limited) return limited;

  const auth = await authenticateDevice(request);
  if (auth.response) return auth.response;

  const formData = await request.formData();
  const file = formData.get("file");
  const taskId = String(formData.get("taskId") ?? "task");
  const kind = String(formData.get("kind") ?? "proof");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing image file." }, { status: 400 });
  }

  const imageError = validateImageFile(file);
  if (imageError) {
    return NextResponse.json({ error: imageError }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      url: "/house-plan.svg",
      path: null,
      storage: "seed",
    });
  }

  const supabase = getSupabaseAdmin();
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const cleanExtension = extension.replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${taskId}/${auth.session.personId}/${Date.now()}-${kind}.${cleanExtension}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error } = await supabase.storage
    .from("proof-images")
    .upload(path, Buffer.from(arrayBuffer), {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await auditLog({
    personId: auth.session.personId,
    deviceId: auth.session.deviceId,
    action: "uploaded_proof_image",
    entityType: "proof_image",
    entityId: taskId,
    metadata: { kind, path, size: file.size, type: file.type },
  });

  const { data: signed } = await supabase.storage
    .from("proof-images")
    .createSignedUrl(path, 60 * 60 * 24 * 7);

  return NextResponse.json({
    url: signed?.signedUrl ?? null,
    path,
    storage: "supabase",
  });
}
