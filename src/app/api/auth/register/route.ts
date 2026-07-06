import { NextRequest, NextResponse } from "next/server";
import { signUp, isMockAuth } from "@/lib/auth";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  organizationName: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = registerSchema.parse(body);

    const result = await signUp(validated);

    // In demo mode there is no email verification step — the account can sign in
    // immediately using the shared demo credentials.
    const needsConfirmation = !isMockAuth();

    return NextResponse.json(
      {
        message: needsConfirmation
          ? "Registration successful. Please check your email for a verification code."
          : "Demo account ready. Sign in with any credentials to explore the platform.",
        userSub: result.userSub,
        needsConfirmation,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const errorName = error instanceof Error ? error.name : "";

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    if (errorName === "UsernameExistsException") {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    if (errorName === "InvalidPasswordException") {
      return NextResponse.json(
        { error: "Password does not meet requirements. Must be at least 8 characters with uppercase, lowercase, number, and special character." },
        { status: 400 }
      );
    }

    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}
