import { NextRequest, NextResponse } from "next/server";
import { confirmSignUp } from "@/lib/auth";
import { z } from "zod";

const confirmSchema = z.object({
  email: z.string().email(),
  code: z.string().min(6).max(6),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = confirmSchema.parse(body);

    await confirmSignUp(email, code);

    return NextResponse.json({
      message: "Email verified successfully. You can now sign in.",
    });
  } catch (error: unknown) {
    const errorName = error instanceof Error ? error.name : "";

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid verification code format" },
        { status: 400 }
      );
    }

    if (errorName === "CodeMismatchException") {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      );
    }

    if (errorName === "ExpiredCodeException") {
      return NextResponse.json(
        { error: "Verification code has expired. Please request a new one." },
        { status: 400 }
      );
    }

    console.error("Confirm error:", error);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}
