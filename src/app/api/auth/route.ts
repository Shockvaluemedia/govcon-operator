import { NextRequest, NextResponse } from "next/server";

// GET /api/auth - Get current session user
export async function GET() {
  // In production, this would validate the JWT token from AWS Cognito
  // and return the authenticated user's profile

  const mockUser = {
    id: "user-001",
    email: "jane@company.com",
    firstName: "Jane",
    lastName: "Doe",
    role: "operator",
    organizationId: "org-001",
    organization: {
      id: "org-001",
      name: "Acme Government Solutions LLC",
      uei: "ABC123DEF456",
      cageCode: "1A2B3",
      samRegistered: true,
      naicsCodes: ["424120", "423430", "424690"],
    },
  };

  return NextResponse.json({ data: mockUser });
}

// POST /api/auth - Login
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, password } = body;

  // In production, this would authenticate via AWS Cognito
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  // Mock successful login
  return NextResponse.json({
    data: {
      token: "mock-jwt-token",
      user: {
        id: "user-001",
        email,
        firstName: "Jane",
        lastName: "Doe",
        role: "operator",
      },
    },
  });
}
