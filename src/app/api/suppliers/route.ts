import { NextRequest, NextResponse } from "next/server";
import { mockSuppliers, mockSupplierQuotes } from "@/data/mock-suppliers";

// GET /api/suppliers - List suppliers
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get("category");
  const search = searchParams.get("search");

  let results = [...mockSuppliers];

  if (category) {
    results = results.filter((s) => s.productCategory === category);
  }

  if (search) {
    const lower = search.toLowerCase();
    results = results.filter(
      (s) =>
        s.name.toLowerCase().includes(lower) ||
        s.productCategory.toLowerCase().includes(lower)
    );
  }

  return NextResponse.json({ data: results });
}

// POST /api/suppliers - Create supplier
export async function POST(request: NextRequest) {
  const body = await request.json();

  const newSupplier = {
    id: `sup-${Date.now()}`,
    ...body,
    organizationId: "org-001",
    createdAt: new Date().toISOString(),
  };

  return NextResponse.json({ data: newSupplier }, { status: 201 });
}
