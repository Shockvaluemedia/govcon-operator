import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { databaseMeta, requiresDatabase } from "@/lib/data-mode";
import type { DashboardMetrics } from "@/types";

// GET /api/dashboard - Get dashboard metrics
export async function GET(request: NextRequest) {
  const databaseRequired = requiresDatabase(request);
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (user) {
      const safeQuery = <T>(promise: Promise<T>, fallback: T): Promise<T> => {
        return databaseRequired ? promise : promise.catch(() => fallback);
      };
      const dueThisWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const [
        savedCount,
        activeWorkflows,
        complianceProfile,
        pendingQuotesCount,
        tasksDueCount,
        quoteItems,
        taskItems,
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
            dueDate: { lte: dueThisWeek },
          },
        }), 0),
        safeQuery(prisma.supplierQuote.findMany({
          where: {
            status: { in: ["pending", "received"] },
            supplier: { organizationId: user.organizationId },
          },
          include: { supplier: true, opportunity: true },
          orderBy: [{ status: "asc" }, { createdAt: "desc" }],
          take: 3,
        }), []),
        safeQuery(prisma.workflowTask.findMany({
          where: {
            status: { in: ["pending", "in_progress"] },
            workflow: { organizationId: user.organizationId },
            dueDate: { lte: dueThisWeek },
          },
          include: { workflow: { include: { opportunity: true } } },
          orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
          take: 4,
        }), []),
      ]);

      const estimatedRevenue = activeWorkflows.reduce(
        (sum, wf) => sum + Number(wf.opportunity.estimatedValue || 0),
        0
      );

      const highRisk = activeWorkflows.filter(
        (wf) => (wf.opportunity.riskScore || 0) >= 50
      );
      const complianceSummary = summarizeCompliance(complianceProfile);

      const metrics: DashboardMetrics = {
        totalSavedOpportunities: savedCount,
        activeBids: activeWorkflows.length,
        complianceScore: complianceProfile?.readinessScore || 0,
        estimatedRevenue,
        highRiskOpportunities: highRisk.length,
        tasksDue: tasksDueCount,
        pendingQuotes: pendingQuotesCount,
        recommendedActions: generateRecommendations(
          complianceProfile?.readinessScore || 0,
          activeWorkflows.length,
          savedCount
        ),
        highRiskItems: highRisk
          .sort(
            (a, b) =>
              (b.opportunity.riskScore || 0) -
              (a.opportunity.riskScore || 0)
          )
          .slice(0, 3)
          .map((workflow) => ({
            id: workflow.id,
            title: workflow.opportunity.title,
            riskScore: workflow.opportunity.riskScore || 0,
            reason: riskReason(
              workflow.opportunity.riskScore || 0,
              workflow.stage
            ),
            dueDate: workflow.opportunity.dueDate.toISOString(),
          })),
        taskItems: taskItems.map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          priority:
            task.status === "blocked"
              ? "critical"
              : task.dueDate && task.dueDate < new Date()
                ? "high"
                : "medium",
          dueDate: task.dueDate?.toISOString(),
          opportunityTitle: task.workflow.opportunity.title,
        })),
        quoteItems: quoteItems.map((quote) => ({
          id: quote.id,
          supplierName: quote.supplier.name,
          productDescription: quote.productDescription,
          status: quote.status,
          totalPrice: Number(quote.totalPrice || 0),
        })),
        complianceSummary,
      };

      return NextResponse.json({ data: metrics, meta: databaseMeta() });
    }

    return NextResponse.json({ error: "Dashboard unavailable" }, { status: 503 });
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
        highRiskItems: [],
        taskItems: [],
        quoteItems: [],
        complianceSummary: { completed: 0, missing: 0, total: 0, missingItems: [] },
      },
    });
  }
}

function riskReason(riskScore: number, stage: string): string {
  if (riskScore >= 70) return "Review compliance, supplier, and timeline risk";
  if (riskScore >= 50) return "Risk review recommended before bid decision";
  return `Currently in ${stage.replaceAll("_", " ")}`;
}

function summarizeCompliance(profile: {
  ueiRegistered: boolean;
  samRegistered: boolean;
  cageCode: boolean;
  naicsCodes: boolean;
  pscCodes: boolean;
  businessBankAccount: boolean;
  insurance: boolean;
  capabilityStatement: boolean;
  pastPerformance: boolean;
  certifications: string[];
} | null) {
  const checks = [
    ["UEI registered", profile?.ueiRegistered],
    ["SAM.gov active", profile?.samRegistered],
    ["CAGE code", profile?.cageCode],
    ["NAICS codes", profile?.naicsCodes],
    ["PSC codes", profile?.pscCodes],
    ["Business bank account", profile?.businessBankAccount],
    ["Insurance", profile?.insurance],
    ["Capability statement", profile?.capabilityStatement],
    ["Past performance", profile?.pastPerformance],
    ["Certifications", Boolean(profile?.certifications?.length)],
  ] as const;

  const completed = checks.filter(([, value]) => Boolean(value)).length;
  const missingItems = checks
    .filter(([, value]) => !value)
    .map(([label]) => label);

  return {
    completed,
    missing: missingItems.length,
    total: checks.length,
    missingItems,
  };
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
