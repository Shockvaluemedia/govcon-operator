import { NextRequest, NextResponse } from "next/server";
import { mockOpportunities } from "@/data/mock-opportunities";

// GET /api/opportunities - List opportunities with filters
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const keyword = searchParams.get("keyword");
  const naicsCode = searchParams.get("naics");
  const agency = searchParams.get("agency");
  const setAside = searchParams.get("setAside");
  const source = searchParams.get("source");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

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

  if (naicsCode) {
    results = results.filter((opp) => opp.naicsCode === naicsCode);
  }

  if (agency) {
    results = results.filter((opp) => opp.agency.toLowerCase().includes(agency.toLowerCase()));
  }

  if (setAside) {
    results = results.filter((opp) => opp.setAsideType === setAside);
  }

  if (source) {
    results = results.filter((opp) => opp.source === source);
  }

  const total = results.length;
  const paginated = results.slice(offset, offset + limit);

  return NextResponse.json({
    data: paginated,
    meta: { total, limit, offset },
  });
}

// POST /api/opportunities - Create/import opportunity
export async function POST(request: NextRequest) {
  const body = await request.json();

  // In production, this would save to PostgreSQL via Prisma
  const newOpportunity = {
    id: `opp-${Date.now()}`,
    ...body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json({ data: newOpportunity }, { status: 201 });
}
