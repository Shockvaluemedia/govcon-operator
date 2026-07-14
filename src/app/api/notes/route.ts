import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

// GET /api/notes - List organization-visible notes with optional filters
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const opportunityId = searchParams.get("opportunityId");
    const type = searchParams.get("type");

    const where: Prisma.NoteWhereInput = {
      user: { organizationId: user.organizationId },
    };

    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (opportunityId) where.opportunityId = opportunityId;
    if (type === "proposal_draft") {
      where.content = { contains: "## Compliance Matrix" };
    }

    const notes = await prisma.note.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ data: notes, meta: { source: "database" } });
  } catch (error) {
    console.error("Notes fetch error:", error);
    return NextResponse.json(
      { error: "Failed to load notes" },
      { status: 500 }
    );
  }
}
