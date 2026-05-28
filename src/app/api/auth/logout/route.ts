import { NextRequest, NextResponse } from "next/server";
import { signOut } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("access_token")?.value;

    if (accessToken) {
      try {
        await signOut(accessToken);
      } catch (error) {
        // Token might be expired, still clear cookies
        console.warn("Cognito sign out failed:", error);
      }
    }

    const response = NextResponse.json({ message: "Logged out successfully" });

    // Clear all auth cookies
    response.cookies.set("access_token", "", { maxAge: 0, path: "/" });
    response.cookies.set("id_token", "", { maxAge: 0, path: "/" });
    response.cookies.set("refresh_token", "", { maxAge: 0, path: "/" });

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
