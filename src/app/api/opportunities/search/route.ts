import { NextRequest, NextResponse } from "next/server";
import { searchSAMOpportunities } from "@/services/integrations/sam-gov";

// GET /api/opportunities/search - Search SAM.gov live
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const keyword = searchParams.get("keyword") || undefined;
  const naicsCode = searchParams.get("naics") || undefined;
  const setAside = searchParams.get("setAside") || undefined;
  const limit = parseInt(searchParams.get("limit") || "25");
  const offset = parseInt(searchParams.get("offset") || "0");

  try {
    const result = await searchSAMOpportunities({
      keyword,
      naicsCode,
      setAside,
      limit,
      offset,
    });

    return NextResponse.json({
      data: result.opportunities,
      meta: {
        total: result.total,
        limit,
        offset,
        source: "SAM.gov",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown SAM.gov search error";
    console.error("SAM.gov search error:", error);

    // If SAM.gov is unavailable, return error with suggestion
    return NextResponse.json(
      {
        error: "SAM.gov search failed",
        message,
        suggestion: "Check that SAM_GOV_API_KEY is configured correctly. Use /api/opportunities for cached/mock data.",
      },
      { status: 502 }
    );
  }
}
