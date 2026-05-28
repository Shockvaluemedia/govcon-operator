import { NextRequest, NextResponse } from "next/server";
import { aiService } from "@/services/ai-service";
import { mockOpportunities } from "@/data/mock-opportunities";

// POST /api/ai/analyze - Run AI analysis on an opportunity
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { opportunityId, text } = body;

  if (!opportunityId && !text) {
    return NextResponse.json(
      { error: "Either opportunityId or text is required" },
      { status: 400 }
    );
  }

  let opportunity;
  if (opportunityId) {
    opportunity = mockOpportunities.find((opp) => opp.id === opportunityId);
    if (!opportunity) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }
  }

  try {
    let analysis;
    if (opportunity) {
      analysis = await aiService.analyzeBidRisk(opportunity);
    } else {
      // For text-based analysis, create a temporary opportunity object
      const tempOpportunity = {
        id: "temp",
        title: "Custom Analysis",
        agency: "Unknown",
        solicitationNumber: "N/A",
        naicsCode: "",
        pscCode: "",
        setAsideType: "",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        estimatedValue: 0,
        source: "SAM.gov" as const,
        status: "active" as const,
        matchScore: 50,
        riskScore: 50,
        description: text,
        requirements: [],
        postedDate: new Date().toISOString(),
        responseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };
      analysis = await aiService.analyzeBidRisk(tempOpportunity);
    }

    return NextResponse.json({
      data: analysis,
      disclaimer: "AI analysis is for decision support only. Final decisions require human review.",
    });
  } catch (error) {
    console.error("AI analysis error:", error);
    return NextResponse.json(
      { error: "Failed to generate analysis" },
      { status: 500 }
    );
  }
}
