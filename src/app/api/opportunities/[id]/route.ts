import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { databaseMeta, requiresDatabase } from "@/lib/data-mode";
import { serializeOpportunity } from "@/lib/opportunities";
import { mockOpportunities } from "@/data/mock-opportunities";
import { getCurrentUser } from "@/lib/auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/opportunities/[id] - Get one opportunity from DB, with demo fallback
export async function GET(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const databaseRequired = requiresDatabase(request);

  try {
    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
    });

    if (opportunity) {
      return NextResponse.json({
        data: serializeOpportunity(opportunity),
        meta: databaseMeta(),
      });
    }

    if (databaseRequired) {
      return NextResponse.json(
        { error: "Opportunity not found", meta: databaseMeta() },
        { status: 404 }
      );
    }
  } catch (error) {
    if (databaseRequired) {
      console.error("Database required for opportunity detail but unavailable:", error);
      return NextResponse.json(
        { error: "Database unavailable", meta: databaseMeta() },
        { status: 503 }
      );
    }
  }

  const mockOpportunity = mockOpportunities.find((opp) => opp.id === id);

  if (!mockOpportunity) {
    return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
  }

  return NextResponse.json({
    data: mockOpportunity,
    meta: { source: "mock" },
  });
}
