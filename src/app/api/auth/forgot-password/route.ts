import { NextRequest, NextResponse } from "next/server";
import { forgotPassword, confirmForgotPassword } from "@/lib/auth";
import { z } from "zod";

const forgotSchema = z.object({
  email: z.string().email(),
});

const resetSchema = z.object({
  email: z.string().email(),
  code: z.string().min(6).max(6),
  newPassword: z.string().min(8),
});

// POST /api/auth/forgot-password - Initiate password reset
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = forgotSchema.parse(body);

    await forgotPassword(email);

    // Always return success to prevent email enumeration
    return NextResponse.json({
      message: "If an account exists with this email, a reset code has been sent.",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    // Don't reveal whether user exists
    return NextResponse.json({
      message: "If an account exists with this email, a reset code has been sent.",
    });
  }
}

// PUT /api/auth/forgot-password - Confirm password reset
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code, newPassword } = resetSchema.parse(body);

    await confirmForgotPassword(email, code, newPassword);

    return NextResponse.json({
      message: "Password reset successful. You can now sign in with your new password.",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    if (error.name === "CodeMismatchException") {
      return NextResponse.json(
        { error: "Invalid reset code" },
        { status: 400 }
      );
    }

    if (error.name === "ExpiredCodeException") {
      return NextResponse.json(
        { error: "Reset code has expired. Please request a new one." },
        { status: 400 }
      );
    }

    console.error("Password reset error:", error);
    return NextResponse.json(
      { error: "Password reset failed" },
      { status: 500 }
    );
  }
}
