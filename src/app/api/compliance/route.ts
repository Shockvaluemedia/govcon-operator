import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { databaseMeta, requiresDatabase } from "@/lib/data-mode";
import { mockComplianceProfile, complianceChecklist } from "@/data/mock-compliance";

// GET /api/compliance - Get compliance profile
export async function GET(request: NextRequest) {
  const databaseRequired = requiresDatabase(request);

  try {
    const user = await getCurrentUser();

    if (user) {
      const profile = await prisma.complianceProfile.findUnique({
        where: { organizationId: user.organizationId },
      });

      if (profile) {
        return NextResponse.json({
          data: {
            profile: {
              ...profile,
              readinessScore: profile.readinessScore,
            },
            checklist: complianceChecklist.map((item) => ({
              ...item,
              completed: getCompletionStatus(item.id, profile),
            })),
          },
          meta: databaseMeta(),
        });
      }

      if (databaseRequired) {
        return NextResponse.json({ data: null, meta: databaseMeta() }, { status: 404 });
      }
    } else if (databaseRequired) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fallback to mock
    return NextResponse.json({
      data: {
        profile: mockComplianceProfile,
        checklist: complianceChecklist,
      },
      meta: { source: "mock" },
    });
  } catch (error) {
    if (databaseRequired) {
      console.error("Database required for compliance but unavailable:", error);
      return NextResponse.json(
        { error: "Database unavailable", meta: { source: "database" } },
        { status: 503 }
      );
    }

    console.warn("Compliance fetch error:", error);
    return NextResponse.json({
      data: {
        profile: mockComplianceProfile,
        checklist: complianceChecklist,
      },
      meta: { source: "mock" },
    });
  }
}

// PUT /api/compliance - Update compliance profile
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const requiredFields = ["ueiRegistered", "samRegistered", "cageCode", "naicsCodes", "pscCodes", "businessBankAccount", "insurance", "capabilityStatement"];
    const recommendedFields = ["pastPerformance"];

    const completedRequired = requiredFields.filter((f) => body[f] === true).length;
    const completedRecommended = recommendedFields.filter((f) => body[f] === true).length;

    const readinessScore = Math.round(
      (completedRequired / requiredFields.length) * 70 +
      (completedRecommended / recommendedFields.length) * 30
    );

    const profile = await prisma.complianceProfile.upsert({
      where: { organizationId: user.organizationId },
      update: {
        ...body,
        readinessScore,
        lastUpdated: new Date(),
      },
      create: {
        organizationId: user.organizationId,
        ...body,
        readinessScore,
        certifications: body.certifications || [],
        setAsideEligibility: body.setAsideEligibility || [],
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "compliance_updated",
        entityType: "compliance_profile",
        entityId: profile.id,
        details: { readinessScore },
      },
    });

    return NextResponse.json({ data: profile });
  } catch (error) {
    console.error("Compliance update error:", error);
    return NextResponse.json(
      { error: "Failed to update compliance profile" },
      { status: 500 }
    );
  }
}

function getCompletionStatus(itemId: string, profile: Record<string, unknown>): boolean {
  const fieldMap: Record<string, string> = {
    uei: "ueiRegistered",
    sam: "samRegistered",
    cage: "cageCode",
    naics: "naicsCodes",
    psc: "pscCodes",
    bank: "businessBankAccount",
    insurance: "insurance",
    capability: "capabilityStatement",
    past_performance: "pastPerformance",
  };

  const field = fieldMap[itemId];
  if (field && profile[field] !== undefined) {
    return Boolean(profile[field]);
  }
  return false;
}
