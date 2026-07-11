import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "This private-house API is disabled in the public product." }, { status: 404 });
}

export const POST = GET;
export const PUT = GET;
export const PATCH = GET;
export const DELETE = GET;

