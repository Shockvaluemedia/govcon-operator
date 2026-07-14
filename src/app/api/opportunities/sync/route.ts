import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isSAMConfigured, searchSAMOpportunities } from "@/services/integrations/sam-gov";
import prisma from "@/lib/prisma";
import { authorizeApiAction } from "@/lib/api-authorization";
import { buildOrganizationProfile, scoreOpportunities } from "@/services/matching-engine";
import type { Opportunity } from "@/types";
import type { Prisma } from "@prisma/client";

const syncSchema = z.object({
  searchId: z.string().trim().optional(),
  keyword: z.string().trim().optional().nullable(),
  naicsCode: z.string().trim().optional().nullable(),
  setAside: z.string().trim().optional().nullable(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

function clean(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed && trimmed !== "all" ? trimmed : undefined;
}

function asDate(value?: string | Date | null, fallback = new Date()) {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function asJson(value: Opportunity): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

// POST /api/opportunities/sync - Sync opportunities from SAM.gov into database
export async function POST(request: NextRequest) {
  const authorization = await authorizeApiAction("opportunities:sync");
  if (!authorization.ok) return authorization.response;
  const { user } = authorization;

  try {
    const parsed = syncSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid sync request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const body = parsed.data;
    let search:
      | {
          id: string;
          keyword: string | null;
          naicsCode: string | null;
          setAside: string | null;
          limit: number;
        }
      | null = null;

    if (body.searchId) {
      search = await prisma.opportunitySearch.findFirst({
        where: {
          id: body.searchId,
          userId: user.id,
          organizationId: user.organizationId,
        },
        select: {
          id: true,
          keyword: true,
          naicsCode: true,
          setAside: true,
          limit: true,
        },
      });

      if (!search) {
        return NextResponse.json({ error: "Saved search not found" }, { status: 404 });
      }
    }

    const params = {
      keyword: clean(search?.keyword ?? body.keyword),
      naicsCode: clean(search?.naicsCode ?? body.naicsCode),
      setAside: clean(search?.setAside ?? body.setAside),
      limit: search?.limit ?? body.limit,
    };

    if (!isSAMConfigured()) {
      if (search) {
        await prisma.opportunitySearch.update({
          where: { id: search.id },
          data: { lastSyncedAt: new Date(), lastResultCount: 0 },
        });
      }

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "opportunities_sync_skipped",
          entityType: "opportunity",
          entityId: "batch",
          details: {
            source: "SAM.gov",
            reason: "missing_api_key",
            params,
            searchId: search?.id,
          },
        },
      });

      return NextResponse.json({
        message: "SAM.gov API key is not configured. Add SAM_GOV_API_KEY to enable live sync.",
        synced: 0,
        skipped: 0,
        totalAvailable: 0,
        meta: { source: "SAM.gov", configured: false, searchId: search?.id ?? null },
      });
    }

    // Fetch from SAM.gov
    const result = await searchSAMOpportunities(params);

    if (result.opportunities.length === 0) {
      if (search) {
        await prisma.opportunitySearch.update({
          where: { id: search.id },
          data: { lastSyncedAt: new Date(), lastResultCount: 0 },
        });
      }

      return NextResponse.json({
        message: "No opportunities found matching criteria",
        synced: 0,
        skipped: 0,
        totalAvailable: result.total,
        meta: { source: "SAM.gov", configured: true, searchId: search?.id ?? null },
      });
    }

    const [org, compliance] = await Promise.all([
      prisma.organization.findUnique({ where: { id: user.organizationId } }),
      prisma.complianceProfile.findUnique({ where: { organizationId: user.organizationId } }),
    ]);

    let scoredOpportunities: Opportunity[] = result.opportunities;
    if (org) {
      const profile = buildOrganizationProfile(
        org,
        compliance ? { ...compliance, lastUpdated: compliance.lastUpdated.toISOString() } : null
      );
      scoredOpportunities = scoreOpportunities(result.opportunities, profile);
    }

    // Upsert opportunities into database
    let synced = 0;
    let skipped = 0;

    for (const opp of scoredOpportunities) {
      try {
        const dueDate = asDate(opp.dueDate);
        const postedDate = asDate(opp.postedDate, dueDate);
        const responseDate = asDate(opp.responseDate, dueDate);

        await prisma.opportunity.upsert({
          where: { id: opp.id },
          update: {
            title: opp.title,
            agency: opp.agency,
            status: opp.status,
            dueDate,
            description: opp.description,
            requirements: opp.requirements,
            matchScore: opp.matchScore,
            riskScore: opp.riskScore,
            estimatedValue: opp.estimatedValue,
            rawData: asJson(opp),
            updatedAt: new Date(),
          },
          create: {
            id: opp.id,
            title: opp.title,
            agency: opp.agency,
            solicitationNumber: opp.solicitationNumber,
            naicsCode: opp.naicsCode,
            pscCode: opp.pscCode,
            setAsideType: opp.setAsideType,
            dueDate,
            estimatedValue: opp.estimatedValue,
            source: "SAM.gov",
            status: opp.status,
            matchScore: opp.matchScore,
            riskScore: opp.riskScore,
            description: opp.description,
            requirements: opp.requirements,
            deliveryRequirements: opp.deliveryRequirements,
            placeOfPerformance: opp.placeOfPerformance,
            pointOfContact: opp.pointOfContact,
            postedDate,
            responseDate,
            archiveDate: opp.archiveDate ? asDate(opp.archiveDate) : undefined,
            productCategory: opp.productCategory,
            certifications: opp.certifications || [],
            rawData: asJson(opp),
          },
        });
        synced++;
      } catch (err) {
        skipped++;
        console.warn(`Failed to sync opportunity ${opp.id}:`, err);
      }
    }

    if (search) {
      await prisma.opportunitySearch.update({
        where: { id: search.id },
        data: { lastSyncedAt: new Date(), lastResultCount: synced },
      });
    }

    // Log the sync action
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "opportunities_synced",
        entityType: "opportunity",
        entityId: "batch",
        details: {
          source: "SAM.gov",
          synced,
          skipped,
          total: result.total,
          params,
          searchId: search?.id,
        },
      },
    });

    return NextResponse.json({
      message: `Synced ${synced} opportunities from SAM.gov`,
      synced,
      skipped,
      totalAvailable: result.total,
      meta: { source: "SAM.gov", configured: true, searchId: search?.id ?? null },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown sync error";
    console.error("Sync error:", error);
    return NextResponse.json(
      { error: "Sync failed", message },
      { status: 500 }
    );
  }
}
