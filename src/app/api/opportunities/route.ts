import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { mockOpportunities } from "@/data/mock-opportunities";
import { scoreOpportunities, buildOrganizationProfile } from "@/services/matching-engine";

// GET /api/opportunities - List opportunities with filters
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const keyword = searchParams.get("keyword");
  const naicsCode = searchParams.get("naics");
  const agency = searchParams.get("agency");
  const setAside = searchParams.get("setAside");
  const source = searchParams.get("source");
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  try {
    // Try database first
    const where: any = {};

    if (keyword) {
      where.OR = [
        { title: { contains: keyword, mode: "insensitive" } },
        { description: { contains: keyword, mode: "insensitive" } },
        { solicitationNumber: { contains: keyword, mode: "insensitive" } },
      ];
    }
    if (naicsCode) where.naicsCode = naicsCode;
    if (agency) where.agency = { contains: agency, mode: "insensitive" };
    if (setAside) where.setAsideType = setAside;
    if (source) where.source = source;
    if (status) where.status = status;

    const [opportunities, total] = await Promise.all([
      prisma.opportunity.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { dueDate: "asc" },
      }),
      prisma.opportunity.count({ where }),
    ]);

    // If database has results, return them
    if (total > 0) {
      return NextResponse.json({
        data: opportunities,
        meta: { total, limit, offset },
      });
    }

    // Fallback to mock data if database is empty
    let results = [...mockOpportunities];

    if (keyword) {
      const lower = keyword.toLowerCase();
      results = results.filter(
        (opp) =>
          opp.title.toLowerCase().includes(lower) ||
          opp.description.toLowerCase().includes(lower) ||
          opp.solicitationNumber.toLowerCase().includes(lower)
      );
    }
    if (naicsCode) results = results.filter((opp) => opp.naicsCode === naicsCode);
    if (agency) results = results.filter((opp) => opp.agency.toLowerCase().includes(agency.toLowerCase()));
    if (setAside) results = results.filter((opp) => opp.setAsideType === setAside);
    if (source) results = results.filter((opp) => opp.source === source);

    // Apply matching engine to score opportunities
    try {
      const user = await getCurrentUser();
      if (user) {
        const [org, compliance] = await Promise.all([
          prisma.organization.findUnique({ where: { id: user.organizationId } }),
          prisma.complianceProfile.findUnique({ where: { organizationId: user.organizationId } }),
        ]);
        if (org) {
          const profile = buildOrganizationProfile(org, compliance as any);
          results = scoreOpportunities(results, profile);
        }
      }
    } catch {
      // Continue without scoring
    }

    const mockTotal = results.length;
    const paginated = results.slice(offset, offset + limit);

    return NextResponse.json({
      data: paginated,
      meta: { total: mockTotal, limit, offset, source: "mock" },
    });
  } catch (error) {
    // If database connection fails, use mock data
    console.warn("Database unavailable, using mock data:", error);

    let results = [...mockOpportunities];
    if (keyword) {
      const lower = keyword.toLowerCase();
      results = results.filter(
        (opp) =>
          opp.title.toLowerCase().includes(lower) ||
          opp.description.toLowerCase().includes(lower)
      );
    }

    return NextResponse.json({
      data: results.slice(offset, offset + limit),
      meta: { total: results.length, limit, offset, source: "mock" },
    });
  }
}

// POST /api/opportunities - Save/import an opportunity
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const opportunity = await prisma.opportunity.create({
      data: {
        title: body.title,
        agency: body.agency,
        solicitationNumber: body.solicitationNumber,
        naicsCode: body.naicsCode,
        pscCode: body.pscCode,
        setAsideType: body.setAsideType,
        dueDate: new Date(body.dueDate),
        estimatedValue: body.estimatedValue,
        source: body.source,
        status: body.status || "active",
        matchScore: body.matchScore,
        riskScore: body.riskScore,
        description: body.description,
        requirements: body.requirements || [],
        deliveryRequirements: body.deliveryRequirements,
        placeOfPerformance: body.placeOfPerformance,
        pointOfContact: body.pointOfContact,
        postedDate: new Date(body.postedDate),
        responseDate: new Date(body.responseDate),
        productCategory: body.productCategory,
        certifications: body.certifications || [],
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "opportunity_created",
        entityType: "opportunity",
        entityId: opportunity.id,
        details: { source: body.source },
      },
    });

    return NextResponse.json({ data: opportunity }, { status: 201 });
  } catch (error) {
    console.error("Create opportunity error:", error);
    return NextResponse.json(
      { error: "Failed to create opportunity" },
      { status: 500 }
    );
  }
}
