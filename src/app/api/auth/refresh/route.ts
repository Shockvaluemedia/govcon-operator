import { NextResponse } from "next/server";
import { refreshTokens } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refresh_token")?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: "No refresh token" },
        { status: 401 }
      );
    }

    const tokens = await refreshTokens(refreshToken);

    const response = NextResponse.json({
      message: "Token refreshed",
      expiresIn: tokens.expiresIn,
    });

    response.cookies.set("access_token", tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: tokens.expiresIn,
      path: "/",
    });

    response.cookies.set("id_token", tokens.idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: tokens.expiresIn,
      path: "/",
    });

    return response;
  } catch (error: unknown) {
    const errorName = error instanceof Error ? error.name : "";

    if (errorName === "NotAuthorizedException") {
      const response = NextResponse.json(
        { error: "Session expired. Please sign in again." },
        { status: 401 }
      );
      response.cookies.set("access_token", "", { maxAge: 0, path: "/" });
      response.cookies.set("id_token", "", { maxAge: 0, path: "/" });
      response.cookies.set("refresh_token", "", { maxAge: 0, path: "/" });
      return response;
    }

    console.error("Token refresh error:", error);
    return NextResponse.json(
      { error: "Token refresh failed" },
      { status: 500 }
    );
  }
}
