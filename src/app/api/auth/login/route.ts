import { NextRequest, NextResponse } from "next/server";
import { signIn } from "@/lib/auth";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    const tokens = await signIn(email, password);

    // Set HTTP-only cookies for tokens
    const response = NextResponse.json({
      message: "Login successful",
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

    response.cookies.set("refresh_token", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    return response;
  } catch (error: unknown) {
    const errorName = error instanceof Error ? error.name : "";

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid email or password format" },
        { status: 400 }
      );
    }

    if (errorName === "NotAuthorizedException") {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (errorName === "UserNotConfirmedException") {
      return NextResponse.json(
        { error: "Please verify your email before signing in" },
        { status: 403 }
      );
    }

    if (error instanceof Error && error.message.includes("Demo user not found")) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}
