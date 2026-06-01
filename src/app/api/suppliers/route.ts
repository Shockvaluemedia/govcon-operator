import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { mockSuppliers } from "@/data/mock-suppliers";
import type { Prisma } from "@prisma/client";

// GET /api/suppliers - List suppliers for the user's organization
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get("category");
  const search = searchParams.get("search");

  try {
    const user = await getCurrentUser();

    if (user) {
      const where: Prisma.SupplierWhereInput = { organizationId: user.organizationId };

      if (category) where.productCategory = category;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { productCategory: { contains: search, mode: "insensitive" } },
        ];
      }

      const suppliers = await prisma.supplier.findMany({
        where,
        include: { quotes: true },
        orderBy: { name: "asc" },
      });

      if (suppliers.length > 0) {
        return NextResponse.json({ data: suppliers });
      }
    }

    // Fallback to mock data
    let results = [...mockSuppliers];
    if (category) results = results.filter((s) => s.productCategory === category);
    if (search) {
      const lower = search.toLowerCase();
      results = results.filter(
        (s) => s.name.toLowerCase().includes(lower) || s.productCategory.toLowerCase().includes(lower)
      );
    }

    return NextResponse.json({ data: results, meta: { source: "mock" } });
  } catch (error) {
    console.warn("Database unavailable for suppliers:", error);
    return NextResponse.json({ data: mockSuppliers, meta: { source: "mock" } });
  }
}

// POST /api/suppliers - Create a new supplier
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const supplier = await prisma.supplier.create({
      data: {
        name: body.name,
        website: body.website,
        contactName: body.contactName,
        contactEmail: body.contactEmail,
        contactPhone: body.contactPhone,
        productCategory: body.productCategory,
        leadTime: body.leadTime,
        unitCost: body.unitCost,
        moq: body.moq,
        shippingEstimate: body.shippingEstimate,
        reliabilityRating: body.reliabilityRating,
        notes: body.notes,
        organizationId: user.organizationId,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "supplier_created",
        entityType: "supplier",
        entityId: supplier.id,
      },
    });

    return NextResponse.json({ data: supplier }, { status: 201 });
  } catch (error) {
    console.error("Create supplier error:", error);
    return NextResponse.json(
      { error: "Failed to create supplier" },
      { status: 500 }
    );
  }
}
