import { NextRequest, NextResponse } from "next/server";
import { searchSAMOpportunities } from "@/services/integrations/sam-gov";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// POST /api/opportunities/sync - Sync opportunities from SAM.gov into database
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { keyword, naicsCode, setAside, limit = 50 } = body;

    // Fetch from SAM.gov
    const result = await searchSAMOpportunities({
      keyword,
      naicsCode,
      setAside,
      limit,
    });

    if (result.opportunities.length === 0) {
      return NextResponse.json({
        message: "No opportunities found matching criteria",
        synced: 0,
      });
    }

    // Upsert opportunities into database
    let synced = 0;
    let skipped = 0;

    for (const opp of result.opportunities) {
      try {
        await prisma.opportunity.upsert({
          where: { id: opp.id },
          update: {
            title: opp.title,
            agency: opp.agency,
            status: opp.status,
            dueDate: new Date(opp.dueDate),
            description: opp.description,
            requirements: opp.requirements,
            updatedAt: new Date(),
          },
          create: {
            id: opp.id,
            title: opp.title,
            agency: opp.agency,
            solicitationNumber: opp.solicitationNumber,
            naicsCode: opp.naicsCode,
            pscCode: opp.pscCode,
            setAsideType: opp.setAsideType,
            dueDate: new Date(opp.dueDate),
            estimatedValue: opp.estimatedValue,
            source: "SAM.gov",
            status: opp.status,
            matchScore: opp.matchScore,
            riskScore: opp.riskScore,
            description: opp.description,
            requirements: opp.requirements,
            deliveryRequirements: opp.deliveryRequirements,
            placeOfPerformance: opp.placeOfPerformance,
            pointOfContact: opp.pointOfContact,
            postedDate: new Date(opp.postedDate),
            responseDate: new Date(opp.responseDate),
            productCategory: opp.productCategory,
            certifications: opp.certifications || [],
          },
        });
        synced++;
      } catch (err) {
        skipped++;
        console.warn(`Failed to sync opportunity ${opp.id}:`, err);
      }
    }

    // Log the sync action
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "opportunities_synced",
        entityType: "opportunity",
        entityId: "batch",
        details: {
          source: "SAM.gov",
          synced,
          skipped,
          total: result.total,
          params: { keyword, naicsCode, setAside },
        },
      },
    });

    return NextResponse.json({
      message: `Synced ${synced} opportunities from SAM.gov`,
      synced,
      skipped,
      totalAvailable: result.total,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown sync error";
    console.error("Sync error:", error);
    return NextResponse.json(
      { error: "Sync failed", message },
      { status: 500 }
    );
  }
}
