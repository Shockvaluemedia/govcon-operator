import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { databaseMeta, requiresDatabase } from "@/lib/data-mode";
import { DashboardMetrics } from "@/types";

// GET /api/dashboard - Get dashboard metrics
export async function GET(request: NextRequest) {
  const databaseRequired = requiresDatabase(request);

  try {
    const user = await getCurrentUser();

    if (user) {
      const safeQuery = <T>(promise: Promise<T>, fallback: T): Promise<T> => {
        return databaseRequired ? promise : promise.catch(() => fallback);
      };

      const [
        savedCount,
        activeWorkflows,
        complianceProfile,
        pendingQuotes,
        tasksDue,
      ] = await Promise.all([
        safeQuery(prisma.savedOpportunity.count({
          where: { organizationId: user.organizationId },
        }), 0),
        safeQuery(prisma.bidWorkflow.findMany({
          where: {
            organizationId: user.organizationId,
            stage: { notIn: ["completed", "lost"] },
          },
          include: { opportunity: true },
        }), []),
        safeQuery(prisma.complianceProfile.findUnique({
          where: { organizationId: user.organizationId },
        }), null),
        safeQuery(prisma.supplierQuote.count({
          where: {
            status: "pending",
            supplier: { organizationId: user.organizationId },
          },
        }), 0),
        safeQuery(prisma.workflowTask.count({
          where: {
            status: { in: ["pending", "in_progress"] },
            workflow: { organizationId: user.organizationId },
            dueDate: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
          },
        }), 0),
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

      return NextResponse.json({ data: metrics, meta: databaseMeta() });
    }

    if (databaseRequired) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fallback mock metrics
    const metrics: DashboardMetrics = {
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

    return NextResponse.json({ data: metrics, meta: { source: "mock" } });
  } catch (error) {
    if (databaseRequired) {
      console.error("Database required for dashboard but unavailable:", error);
      return NextResponse.json(
        { error: "Database unavailable", meta: { source: "database" } },
        { status: 503 }
      );
    }

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
