import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

// GET /api/auth - Get current session user (legacy endpoint, use /api/auth/me)
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    return NextResponse.json({ data: user });
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json({ error: "Auth check failed" }, { status: 500 });
  }
}

// POST /api/auth - Removed legacy login surface
export async function POST() {
  return NextResponse.json(
    { error: "Legacy login removed. Use /api/auth/login." },
    { status: 410 }
  );
}
