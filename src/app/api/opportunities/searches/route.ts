import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { authorizeApiAction } from "@/lib/api-authorization";

const searchSchema = z.object({
  name: z.string().trim().min(1, "name is required").max(80),
  keyword: z.string().trim().max(160).optional().nullable(),
  naicsCode: z.string().trim().max(16).optional().nullable(),
  agency: z.string().trim().max(120).optional().nullable(),
  setAside: z.string().trim().max(120).optional().nullable(),
  source: z.string().trim().max(40).optional().nullable(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

function clean(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed && trimmed !== "all" ? trimmed : null;
}

// GET /api/opportunities/searches - List saved opportunity searches
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searches = await prisma.opportunitySearch.findMany({
      where: { userId: user.id, organizationId: user.organizationId },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ data: searches });
  } catch (error) {
    console.error("Fetch saved searches error:", error);
    return NextResponse.json(
      { error: "Failed to load saved searches" },
      { status: 500 }
    );
  }
}

// POST /api/opportunities/searches - Create or update a saved search by name
export async function POST(request: NextRequest) {
  const authorization = await authorizeApiAction("saved-searches:manage");
  if (!authorization.ok) return authorization.response;
  const { user } = authorization;

  try {
    const parsed = searchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid saved search", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const data = {
      keyword: clean(payload.keyword),
      naicsCode: clean(payload.naicsCode),
      agency: clean(payload.agency),
      setAside: clean(payload.setAside),
      source: clean(payload.source),
      limit: payload.limit,
    };

    const search = await prisma.opportunitySearch.upsert({
      where: {
        userId_name: {
          userId: user.id,
          name: payload.name,
        },
      },
      update: data,
      create: {
        name: payload.name,
        userId: user.id,
        organizationId: user.organizationId,
        ...data,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "opportunity_search_saved",
        entityType: "opportunity_search",
        entityId: search.id,
        details: { name: search.name },
      },
    });

    return NextResponse.json({ data: search }, { status: 201 });
  } catch (error) {
    console.error("Save search error:", error);
    return NextResponse.json(
      { error: "Failed to save search" },
      { status: 500 }
    );
  }
}

// DELETE /api/opportunities/searches?id=... - Delete a saved search
export async function DELETE(request: NextRequest) {
  const authorization = await authorizeApiAction("saved-searches:manage");
  if (!authorization.ok) return authorization.response;
  const { user } = authorization;

  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await prisma.opportunitySearch.deleteMany({
      where: { id, userId: user.id, organizationId: user.organizationId },
    });

    return NextResponse.json({ message: "Saved search deleted" });
  } catch (error) {
    console.error("Delete search error:", error);
    return NextResponse.json(
      { error: "Failed to delete search" },
      { status: 500 }
    );
  }
}
