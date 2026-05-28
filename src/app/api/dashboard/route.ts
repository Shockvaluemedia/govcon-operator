import { NextResponse } from "next/server";
import { DashboardMetrics } from "@/types";

// GET /api/dashboard - Get dashboard metrics
export async function GET() {
  const metrics: DashboardMetrics = {
    totalSavedOpportunities: 12,
    activeBids: 5,
    complianceScore: 72,
    estimatedRevenue: 1236000,
    highRiskOpportunities: 3,
    tasksDue: 4,
    pendingQuotes: 2,
    recommendedActions: [
      "Complete your Capability Statement to increase compliance score to 80%",
      "Request quotes for SPE7LX-24-R-0142 — deadline in 18 days",
      "Review 3 new opportunities matching your NAICS codes",
      "Update SAM.gov registration (renewal due in 45 days)",
    ],
  };

  return NextResponse.json({ data: metrics });
}
