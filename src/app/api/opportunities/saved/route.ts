import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/opportunities/saved - List saved opportunities
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const saved = await prisma.savedOpportunity.findMany({
      where: { userId: user.id },
      include: { opportunity: true },
      orderBy: { savedAt: "desc" },
    });

    return NextResponse.json({ data: saved });
  } catch (error) {
    console.error("Fetch saved opportunities error:", error);
    return NextResponse.json({ data: [] });
  }
}

// POST /api/opportunities/saved - Save an opportunity
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { opportunityId, notes } = body;

    if (!opportunityId) {
      return NextResponse.json({ error: "opportunityId is required" }, { status: 400 });
    }

    // Check if already saved
    const existing = await prisma.savedOpportunity.findUnique({
      where: {
        opportunityId_userId: {
          opportunityId,
          userId: user.id,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ data: existing, message: "Already saved" });
    }

    const saved = await prisma.savedOpportunity.create({
      data: {
        opportunityId,
        userId: user.id,
        organizationId: user.organizationId,
        notes,
      },
      include: { opportunity: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "opportunity_saved",
        entityType: "saved_opportunity",
        entityId: saved.id,
        details: { opportunityId },
      },
    });

    return NextResponse.json({ data: saved }, { status: 201 });
  } catch (error) {
    console.error("Save opportunity error:", error);
    return NextResponse.json(
      { error: "Failed to save opportunity" },
      { status: 500 }
    );
  }
}

// DELETE /api/opportunities/saved - Unsave an opportunity
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const opportunityId = searchParams.get("opportunityId");

    if (!opportunityId) {
      return NextResponse.json({ error: "opportunityId is required" }, { status: 400 });
    }

    await prisma.savedOpportunity.deleteMany({
      where: {
        opportunityId,
        userId: user.id,
      },
    });

    return NextResponse.json({ message: "Opportunity unsaved" });
  } catch (error) {
    console.error("Unsave opportunity error:", error);
    return NextResponse.json(
      { error: "Failed to unsave opportunity" },
      { status: 500 }
    );
  }
}
