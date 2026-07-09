import "server-only";

import { pbkdf2Sync, randomBytes, timingSafeEqual, createHash } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSeedHouseState } from "@/lib/house-data";
import {
  dbQueryOne,
  insertRow,
  isPostgresConfigured,
  upsertRow,
  updateRows,
} from "@/lib/server/db";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const PIN_HASH_ITERATIONS = 120_000;

type DeviceRecord = {
  device_id: string;
  person_id: string;
  pin_hash: string;
  session_token_hash: string | null;
  session_expires_at: string | null;
  last_active_at: string;
  failed_attempts: number;
  locked_until: string | null;
};

const fallbackDevices = new Map<string, DeviceRecord>();
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const legacyPersonNameById: Record<string, string> = {
  "user-alex": "Alex",
  "user-blair": "Blair",
  "user-casey": "Casey",
  "user-devin": "Devin",
  "user-ellis": "Ellis",
  "user-finley": "Finley",
};

const deviceSessionSchema = z.object({
  deviceId: z.string().min(8),
  sessionToken: z.string().min(24),
});

export type DeviceSession = z.infer<typeof deviceSessionSchema> & {
  personId: string;
};

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function parseJson<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<{ data: T; response?: never } | { data?: never; response: NextResponse }> {
  try {
    const payload = await request.json();
    return { data: schema.parse(payload) };
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? error.issues.map((issue) => issue.message).join(", ")
        : "Invalid JSON payload.";
    return { response: jsonError(message, 400) };
  }
}

export function getClientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

export function rateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number,
) {
  const deviceId = request.headers.get("x-housefair-device-id") ?? "no-device";
  const key = `${scope}:${deviceId}:${getClientIp(request)}`;
  const now = Date.now();
  const bucket = rateBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return NextResponse.json(
      {
        error: "Too many attempts. Please wait a little and try again.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((bucket.resetAt - now) / 1000)),
        },
      },
    );
  }

  return null;
}

function hashPin(pin: string, salt = randomBytes(16).toString("hex")) {
  const hash = pbkdf2Sync(pin, salt, PIN_HASH_ITERATIONS, 32, "sha256").toString(
    "hex",
  );
  return `${PIN_HASH_ITERATIONS}:${salt}:${hash}`;
}

function verifyPin(pin: string, storedHash: string) {
  const [iterations, salt, hash] = storedHash.split(":");
  if (!iterations || !salt || !hash) return false;
  const candidate = pbkdf2Sync(
    pin,
    salt,
    Number(iterations),
    32,
    "sha256",
  ).toString("hex");

  return timingSafeEqual(Buffer.from(candidate, "hex"), Buffer.from(hash, "hex"));
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function personLookupName(identifier: string) {
  const seedUser = createSeedHouseState().users.find(
    (user) => user.id === identifier || user.name.toLowerCase() === identifier.toLowerCase(),
  );

  return seedUser?.name ?? legacyPersonNameById[identifier] ?? null;
}

async function resolvePersonId(identifier: string) {
  const lookupName = personLookupName(identifier);

  if (isPostgresConfigured()) {
    const data = await dbQueryOne<{ id: string }>(
      `select id from public.users
       where ($1::text is not null and id::text = $1)
          or ($2::text is not null and lower(name) = lower($2))
       limit 1`,
      [isUuid(identifier) ? identifier : null, lookupName ?? identifier],
    );
    return data?.id ?? null;
  }

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();

    if (isUuid(identifier)) {
      const { data } = await supabase
        .from("users")
        .select("id")
        .eq("id", identifier)
        .single();
      if (data?.id) return data.id as string;
    }

    if (lookupName) {
      const { data } = await supabase
        .from("users")
        .select("id")
        .eq("name", lookupName)
        .single();
      if (data?.id) return data.id as string;
    }

    return null;
  }

  const seedUser = createSeedHouseState().users.find(
    (user) => user.id === identifier || user.name === lookupName,
  );
  return seedUser?.id ?? null;
}

async function upsertDevice(record: DeviceRecord) {
  if (isPostgresConfigured()) {
    const data = await upsertRow<DeviceRecord>("user_devices", record, ["device_id"]);
    return data ?? record;
  }

  if (!isSupabaseConfigured()) {
    fallbackDevices.set(record.device_id, record);
    return record;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("user_devices")
    .upsert(record, { onConflict: "device_id" })
    .select("*")
    .single();

  if (error) throw error;
  return data as DeviceRecord;
}

async function getDevice(deviceId: string) {
  if (isPostgresConfigured()) {
    return dbQueryOne<DeviceRecord>(
      "select * from public.user_devices where device_id = $1 limit 1",
      [deviceId],
    );
  }

  if (!isSupabaseConfigured()) {
    return fallbackDevices.get(deviceId) ?? null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("user_devices")
    .select("*")
    .eq("device_id", deviceId)
    .single();

  if (error) return null;
  return data as DeviceRecord;
}

async function updateDevice(deviceId: string, patch: Partial<DeviceRecord>) {
  if (isPostgresConfigured()) {
    await updateRows<DeviceRecord>("user_devices", patch, "device_id = $1", [
      deviceId,
    ]);
    return;
  }

  if (!isSupabaseConfigured()) {
    const current = fallbackDevices.get(deviceId);
    if (!current) return;
    fallbackDevices.set(deviceId, { ...current, ...patch });
    return;
  }

  const supabase = getSupabaseAdmin();
  await supabase.from("user_devices").update(patch).eq("device_id", deviceId);
}

export async function registerDevice(input: { personId: string; pin: string }) {
  const personId = await resolvePersonId(input.personId);

  if (!personId) throw new Error("Unknown house member.");

  const deviceId = crypto.randomUUID();
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  await upsertDevice({
    device_id: deviceId,
    person_id: personId,
    pin_hash: hashPin(input.pin),
    session_token_hash: hashToken(token),
    session_expires_at: expiresAt,
    last_active_at: new Date().toISOString(),
    failed_attempts: 0,
    locked_until: null,
  });

  return { deviceId, personId, sessionToken: token, expiresAt };
}

export async function verifyDevicePin(input: { deviceId: string; pin: string }) {
  const device = await getDevice(input.deviceId);
  if (!device) throw new Error("Unknown device.");

  if (device.locked_until && new Date(device.locked_until).getTime() > Date.now()) {
    throw new Error("Too many PIN attempts. Try again later.");
  }

  if (!verifyPin(input.pin, device.pin_hash)) {
    const failedAttempts = device.failed_attempts + 1;
    await updateDevice(device.device_id, {
      failed_attempts: failedAttempts,
      locked_until:
        failedAttempts >= 5
          ? new Date(Date.now() + 10 * 60 * 1000).toISOString()
          : null,
    });
    throw new Error("Incorrect PIN.");
  }

  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await updateDevice(device.device_id, {
    session_token_hash: hashToken(token),
    session_expires_at: expiresAt,
    failed_attempts: 0,
    locked_until: null,
    last_active_at: new Date().toISOString(),
  });

  return {
    deviceId: device.device_id,
    personId: device.person_id,
    sessionToken: token,
    expiresAt,
  };
}

export async function resetDevicePin(input: {
  deviceId: string;
  currentPin: string;
  newPin: string;
}) {
  const device = await getDevice(input.deviceId);
  if (!device) throw new Error("Unknown device.");

  if (device.locked_until && new Date(device.locked_until).getTime() > Date.now()) {
    throw new Error("Too many PIN attempts. Try again later.");
  }

  if (!verifyPin(input.currentPin, device.pin_hash)) {
    const failedAttempts = device.failed_attempts + 1;
    await updateDevice(device.device_id, {
      failed_attempts: failedAttempts,
      locked_until:
        failedAttempts >= 5
          ? new Date(Date.now() + 10 * 60 * 1000).toISOString()
          : null,
    });
    throw new Error("Current PIN is incorrect.");
  }

  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await updateDevice(device.device_id, {
    pin_hash: hashPin(input.newPin),
    session_token_hash: hashToken(token),
    session_expires_at: expiresAt,
    failed_attempts: 0,
    locked_until: null,
    last_active_at: new Date().toISOString(),
  });

  return {
    deviceId: device.device_id,
    personId: device.person_id,
    sessionToken: token,
    expiresAt,
  };
}

export async function authenticateDevice(request: Request) {
  const headerDeviceId = request.headers.get("x-housefair-device-id");
  const auth = request.headers.get("authorization");
  const parsed = deviceSessionSchema.safeParse({
    deviceId: headerDeviceId,
    sessionToken: auth?.startsWith("Bearer ") ? auth.slice(7) : null,
  });

  if (!parsed.success) {
    return { response: jsonError("Device PIN confirmation required.", 401) };
  }

  const device = await getDevice(parsed.data.deviceId);
  if (
    !device ||
    !device.session_token_hash ||
    !device.session_expires_at ||
    new Date(device.session_expires_at).getTime() < Date.now() ||
    device.session_token_hash !== hashToken(parsed.data.sessionToken)
  ) {
    return { response: jsonError("Device PIN confirmation required.", 401) };
  }

  await updateDevice(device.device_id, {
    last_active_at: new Date().toISOString(),
  });

  return {
    session: {
      ...parsed.data,
      personId: device.person_id,
    },
  };
}

export async function auditLog(input: {
  personId: string | null;
  deviceId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  if (isPostgresConfigured()) {
    await insertRow("audit_logs", {
      user_id: input.personId,
      device_id: input.deviceId,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      metadata: input.metadata ?? {},
    });
    return;
  }

  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseAdmin();
  await supabase.from("audit_logs").insert({
    user_id: input.personId,
    device_id: input.deviceId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? {},
  });
}

export function validateImageFile(file: File, maxBytes = 8 * 1024 * 1024) {
  const allowedTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
  ]);

  if (!allowedTypes.has(file.type)) {
    return "Upload a JPG, PNG, WebP, or HEIC image.";
  }

  if (file.size > maxBytes) {
    return "Image must be 8 MB or smaller.";
  }

  return null;
}
