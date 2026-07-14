import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get full user profile with organization
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        organization: true,
        userRoles: true,
      },
    });

    if (!fullUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        id: fullUser.id,
        email: fullUser.email,
        firstName: fullUser.firstName,
        lastName: fullUser.lastName,
        role:
          fullUser.userRoles.find(
            (role) => role.organizationId === fullUser.organizationId
          )?.role || "viewer",
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
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json({ error: "Failed to get user" }, { status: 500 });
  }
}
