import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { databaseMeta, requiresDatabase } from "@/lib/data-mode";
import { mockSuppliers } from "@/data/mock-suppliers";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => value || null);

const optionalDecimal = z.number().finite().min(0).optional().nullable();
const optionalInteger = z.number().int().min(0).optional().nullable();

const createSupplierSchema = z.object({
  name: z.string().trim().min(1),
  website: optionalText,
  contactName: optionalText,
  contactEmail: optionalText,
  contactPhone: optionalText,
  productCategory: z.string().trim().min(1),
  leadTime: optionalText,
  unitCost: optionalDecimal,
  moq: optionalInteger,
  shippingEstimate: optionalDecimal,
  reliabilityRating: optionalDecimal.refine((value) => value == null || value <= 5, {
    message: "Reliability rating must be between 0 and 5",
  }),
  notes: optionalText,
});

// GET /api/suppliers - List suppliers for the user's organization
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const databaseRequired = requiresDatabase(request);
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
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
        return NextResponse.json({ data: suppliers, meta: databaseMeta(suppliers.length) });
      }

      if (databaseRequired) {
        return NextResponse.json({ data: [], meta: databaseMeta(0) });
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
    if (databaseRequired) {
      console.error("Database required for suppliers but unavailable:", error);
      return NextResponse.json(
        { error: "Database unavailable", meta: { source: "database" } },
        { status: 503 }
      );
    }

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

    const body = createSupplierSchema.parse(await request.json());

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
      include: { quotes: true },
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
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid supplier details", issues: error.issues },
        { status: 400 }
      );
    }

    console.error("Create supplier error:", error);
    return NextResponse.json(
      { error: "Failed to create supplier" },
      { status: 500 }
    );
  }
}
