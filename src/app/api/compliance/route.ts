import { NextRequest, NextResponse } from "next/server";
import { mockComplianceProfile, complianceChecklist } from "@/data/mock-compliance";

// GET /api/compliance - Get compliance profile
export async function GET() {
  return NextResponse.json({
    data: {
      profile: mockComplianceProfile,
      checklist: complianceChecklist,
    },
  });
}

// PUT /api/compliance - Update compliance profile
export async function PUT(request: NextRequest) {
  const body = await request.json();

  // In production, this would update via Prisma
  const updatedProfile = {
    ...mockComplianceProfile,
    ...body,
    lastUpdated: new Date().toISOString(),
  };

  // Recalculate readiness score
  const items = complianceChecklist.map((item) => ({
    ...item,
    completed: body[item.id] !== undefined ? body[item.id] : item.completed,
  }));

  const completedRequired = items.filter((i) => i.priority === "required" && i.completed).length;
  const totalRequired = items.filter((i) => i.priority === "required").length;
  const completedRecommended = items.filter((i) => i.priority === "recommended" && i.completed).length;
  const totalRecommended = items.filter((i) => i.priority === "recommended").length;

  const score = Math.round(
    (completedRequired / totalRequired) * 70 +
    (completedRecommended / Math.max(totalRecommended, 1)) * 30
  );

  updatedProfile.readinessScore = score;

  return NextResponse.json({ data: updatedProfile });
}
