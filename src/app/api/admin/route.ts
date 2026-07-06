import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";

// GET /api/admin - Get admin dashboard data
export async function GET() {
  try {
    await requireRole(["owner", "admin"]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json(
      { error: message },
      { status: message.startsWith("Forbidden") ? 403 : 401 }
    );
  }

  const adminData = {
    users: {
      total: 24,
      active: 18,
      newThisMonth: 5,
    },
    organizations: {
      total: 8,
      active: 6,
    },
    opportunities: {
      analyzed: 156,
      saved: 89,
      inWorkflow: 32,
    },
    ai: {
      totalCalls: 424,
      analyses: 89,
      chatMessages: 256,
      documentSummaries: 34,
      complianceExtractions: 45,
    },
    workflows: {
      active: 32,
      completed: 12,
      awarded: 3,
    },
    integrations: [
      { name: "SAM.gov", status: "connected", lastSync: "2026-05-28T10:00:00Z" },
      { name: "DLA DIBBS", status: "connected", lastSync: "2026-05-28T08:00:00Z" },
      { name: "FPDS", status: "disconnected", lastSync: null },
      { name: "USAspending", status: "disconnected", lastSync: null },
    ],
  };

  return NextResponse.json({ data: adminData });
}
