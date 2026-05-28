import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

// GET /api/auth - Get current session user (legacy endpoint, use /api/auth/me)
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      // Return mock user in development when Cognito is not configured
      if (!process.env.COGNITO_USER_POOL_ID) {
        return NextResponse.json({
          data: {
            id: "user-demo-001",
            email: "demo@govcon-operator.com",
            firstName: "Jane",
            lastName: "Doe",
            role: "operator",
            organizationId: "org-demo-001",
            organization: {
              id: "org-demo-001",
              name: "Acme Government Solutions LLC",
              uei: "ABC123DEF456",
              cageCode: "1A2B3",
              samRegistered: true,
              naicsCodes: ["424120", "423430", "424690"],
            },
          },
        });
      }

      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    return NextResponse.json({ data: user });
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json({ error: "Auth check failed" }, { status: 500 });
  }
}

// POST /api/auth - Legacy login (redirects to /api/auth/login)
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  // In development without Cognito, allow mock login
  if (!process.env.COGNITO_USER_POOL_ID) {
    const response = NextResponse.json({
      data: {
        token: "mock-jwt-token",
        user: {
          id: "user-demo-001",
          email,
          firstName: "Jane",
          lastName: "Doe",
          role: "operator",
        },
      },
    });

    response.cookies.set("access_token", "mock-access-token", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 3600,
      path: "/",
    });

    return response;
  }

  // Forward to proper login endpoint
  return NextResponse.json(
    { error: "Use /api/auth/login endpoint" },
    { status: 308 }
  );
}
