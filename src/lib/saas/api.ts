import "server-only";

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ensureProfile, getCurrentUser, getPrimaryHousehold } from "@/lib/saas/auth";
import { getCurrentHouseholdMember } from "@/lib/saas/core";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export async function getHouseholdApiContext() {
  const user = await getCurrentUser();
  if (!user) throw new ApiError("Sign in required.", 401);
  await ensureProfile(user);
  const household = await getPrimaryHousehold(user.id);
  if (!household) throw new ApiError("Create or join a household first.", 403);
  const member = await getCurrentHouseholdMember(household.id, user.id);
  return { user, household, member };
}

export async function apiErrorResponse(error: unknown, source: string) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: error.issues.map((issue) => issue.message).join(", ") },
      { status: 400 },
    );
  }

  console.error(`[${source}]`, error);

  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}

export function requireHouseholdAdmin(role: string) {
  if (role !== "owner" && role !== "admin") {
    throw new ApiError("Household owner or admin access required.", 403);
  }
}
