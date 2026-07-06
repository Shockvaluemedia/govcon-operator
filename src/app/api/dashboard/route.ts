import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { DashboardMetrics } from "@/types";

// Showcase metrics used when no database is connected (zero-config demo).
const DEMO_METRICS: DashboardMetrics = {
  totalSavedOpportunities: 12,
  activeBids: 5,
  complianceScore: 72,
  estimatedRevenue: 1236000,
  highRiskOpportunities: 3,
  tasksDue: 4,
  pendingQuotes: 2,
  recommendedActions: [
    "Complete your Capability Statement to increase compliance score",
    "Request quotes for upcoming bid deadlines",
    "Review new opportunities matching your NAICS codes",
    "Update SAM.gov registration if renewal is approaching",
  ],
};

// GET /api/dashboard - Get dashboard metrics
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (user) {
      try {
        const [
          savedCount,
          activeWorkflows,
          complianceProfile,
          pendingQuotes,
          tasksDue,
        ] = await Promise.all([
          prisma.savedOpportunity.count({
            where: { organizationId: user.organizationId },
          }),
          prisma.bidWorkflow.findMany({
            where: {
              organizationId: user.organizationId,
              stage: { notIn: ["completed", "lost"] },
            },
            include: { opportunity: true },
          }),
          prisma.complianceProfile.findUnique({
            where: { organizationId: user.organizationId },
          }),
          prisma.supplierQuote.count({
            where: {
              status: "pending",
              supplier: { organizationId: user.organizationId },
            },
          }),
          prisma.workflowTask.count({
            where: {
              status: { in: ["pending", "in_progress"] },
              workflow: { organizationId: user.organizationId },
              dueDate: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
            },
          }),
        ]);

        const estimatedRevenue = activeWorkflows.reduce(
          (sum, wf) => sum + Number(wf.opportunity.estimatedValue || 0),
          0
        );

        const highRisk = activeWorkflows.filter(
          (wf) => (wf.opportunity.riskScore || 0) >= 50
        ).length;

        const metrics: DashboardMetrics = {
          totalSavedOpportunities: savedCount,
          activeBids: activeWorkflows.length,
          complianceScore: complianceProfile?.readinessScore || 0,
          estimatedRevenue,
          highRiskOpportunities: highRisk,
          tasksDue,
          pendingQuotes,
          recommendedActions: generateRecommendations(
            complianceProfile?.readinessScore || 0,
            activeWorkflows.length,
            savedCount
          ),
        };

        return NextResponse.json({ data: metrics });
      } catch (dbError) {
        // Authenticated but the database is unavailable (e.g. zero-config demo).
        // Show the populated demo workspace rather than an empty dashboard.
        console.warn("Dashboard DB unavailable, using demo metrics:", dbError);
        return NextResponse.json({ data: DEMO_METRICS, meta: { source: "demo" } });
      }
    }

    // Unauthenticated fallback.
    return NextResponse.json({ data: DEMO_METRICS, meta: { source: "mock" } });
  } catch (error) {
    console.warn("Dashboard metrics error:", error);
    return NextResponse.json({
      data: {
        totalSavedOpportunities: 0,
        activeBids: 0,
        complianceScore: 0,
        estimatedRevenue: 0,
        highRiskOpportunities: 0,
        tasksDue: 0,
        pendingQuotes: 0,
        recommendedActions: ["Set up your profile to get started"],
      },
    });
  }
}

function generateRecommendations(
  complianceScore: number,
  activeBids: number,
  savedOpps: number
): string[] {
  const actions: string[] = [];

  if (complianceScore < 80) {
    actions.push("Complete missing compliance items to improve your readiness score");
  }
  if (complianceScore < 50) {
    actions.push("Create a Capability Statement — it's required for most bids");
  }
  if (activeBids === 0 && savedOpps > 0) {
    actions.push("Start a bid workflow for your saved opportunities");
  }
  if (savedOpps === 0) {
    actions.push("Search for opportunities matching your NAICS codes");
  }
  if (activeBids > 0) {
    actions.push("Review upcoming bid deadlines and ensure quotes are in");
  }

  actions.push("Keep your SAM.gov registration current (renew annually)");

  return actions.slice(0, 4);
}
