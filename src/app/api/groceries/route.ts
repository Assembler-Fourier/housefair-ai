import { NextResponse } from "next/server";
import { z } from "zod";
import {
  auditLog,
  authenticateDevice,
  parseJson,
} from "@/lib/server/security";
import { insertRow, isPostgresConfigured, upsertRow } from "@/lib/server/db";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { GroceryItem } from "@/lib/types";

export const runtime = "nodejs";

const grocerySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  category: z.string().min(1).default("Custom"),
  status: z.enum(["available", "running_low", "needed", "bought"]),
  price: z.coerce.number().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  const auth = await authenticateDevice(request);
  if (auth.response) return auth.response;

  const parsed = await parseJson(request, grocerySchema);
  if (parsed.response) return parsed.response;

  const input = parsed.data;
  const item = {
    id: input.id ?? crypto.randomUUID(),
    name: input.name,
    category: input.category,
    status: input.status,
    added_by: auth.session.personId,
    bought_by: input.status === "bought" ? auth.session.personId : null,
    date: new Date().toISOString().slice(0, 10),
    price: input.price ?? null,
    notes: input.notes ?? null,
    created_at: new Date().toISOString(),
  };

  if (!isSupabaseConfigured() && !isPostgresConfigured()) {
    return NextResponse.json({ item });
  }

  if (isPostgresConfigured()) {
    const data = await upsertRow<GroceryItem>("groceries", item, ["name"]);
    if (!data) {
      return NextResponse.json({ error: "Grocery item could not be saved." }, { status: 500 });
    }

    if (["running_low", "needed"].includes(data.status)) {
      await insertRow("notifications", {
        recipient: null,
        title: `${data.name} is ${data.status === "needed" ? "needed" : "running low"}`,
        body: `${data.name} is ${data.status === "needed" ? "on the shopping list" : "running low"}.`,
        type: "grocery",
        payload: { grocery_id: data.id },
      });
    }

    await auditLog({
      personId: auth.session.personId,
      deviceId: auth.session.deviceId,
      action: "updated_grocery",
      entityType: "grocery",
      entityId: data.id,
      metadata: { name: data.name, status: data.status },
    });

    return NextResponse.json({ item: data });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("groceries")
    .upsert(item)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (["running_low", "needed"].includes(data.status)) {
    await supabase.from("notifications").insert({
      recipient: null,
      title: `${data.name} is ${data.status === "needed" ? "needed" : "running low"}`,
      body: `${data.name} is ${data.status === "needed" ? "on the shopping list" : "running low"}.`,
      type: "grocery",
      payload: { grocery_id: data.id },
    });
  }

  await auditLog({
    personId: auth.session.personId,
    deviceId: auth.session.deviceId,
    action: "updated_grocery",
    entityType: "grocery",
    entityId: data.id,
    metadata: { name: data.name, status: data.status },
  });

  return NextResponse.json({ item: data });
}
