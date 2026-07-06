import { NextResponse } from "next/server";
import { getCurrentUser, DEMO_ORGANIZATION } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Try to load the full profile with organization from the database.
    try {
      const fullUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          organization: true,
          userRoles: true,
        },
      });

      if (fullUser) {
        return NextResponse.json({
          data: {
            id: fullUser.id,
            email: fullUser.email,
            firstName: fullUser.firstName,
            lastName: fullUser.lastName,
            role: fullUser.userRoles[0]?.role || "viewer",
            organization: {
              id: fullUser.organization.id,
              name: fullUser.organization.name,
              uei: fullUser.organization.uei,
              cageCode: fullUser.organization.cageCode,
              samRegistered: fullUser.organization.samRegistered,
              naicsCodes: fullUser.organization.naicsCodes,
              pscCodes: fullUser.organization.pscCodes,
            },
          },
        });
      }
    } catch (dbError) {
      // Database unavailable — fall through to the demo profile below.
      console.warn("User profile lookup failed, using demo profile:", dbError);
    }

    // Demo fallback: return the authenticated identity with the demo organization
    // so the app is fully walkable without a seeded database.
    return NextResponse.json({
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organization: DEMO_ORGANIZATION,
      },
      meta: { source: "demo" },
    });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json({ error: "Failed to get user" }, { status: 500 });
  }
}
