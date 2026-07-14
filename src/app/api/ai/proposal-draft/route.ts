import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authorizeApiAction } from "@/lib/api-authorization";
import { serializeOpportunity } from "@/lib/opportunities";
import { generateProposalDraft } from "@/services/ai-service";
import { mockOpportunities } from "@/data/mock-opportunities";
import type { ProposalDraft } from "@/types";

const proposalDraftSchema = z.object({
  opportunityId: z.string().min(1),
});

// POST /api/ai/proposal-draft - Generate a first-pass proposal draft
export async function POST(request: NextRequest) {
  const authorization = await authorizeApiAction("ai:execute");
  if (!authorization.ok) return authorization.response;
  const { user } = authorization;

  try {
    const parsed = proposalDraftSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid proposal draft request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const dbOpportunity = await prisma.opportunity.findUnique({
      where: { id: parsed.data.opportunityId },
    });

    const opportunity = dbOpportunity
      ? serializeOpportunity(dbOpportunity)
      : mockOpportunities.find((opp) => opp.id === parsed.data.opportunityId);

    if (!opportunity) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    const [organization, compliance] = await Promise.all([
      prisma.organization.findUnique({ where: { id: user.organizationId } }),
      prisma.complianceProfile.findUnique({
        where: { organizationId: user.organizationId },
      }),
    ]);

    const draft = await generateProposalDraft(opportunity, {
      organizationName: organization?.name,
      complianceScore: compliance?.readinessScore,
      certifications: compliance?.certifications || [],
      setAsideEligibility: compliance?.setAsideEligibility || [],
    });

    let noteId: string | undefined;

    if (dbOpportunity) {
      try {
        const note = await prisma.note.create({
          data: {
            entityType: "opportunity",
            entityId: opportunity.id,
            opportunityId: opportunity.id,
            userId: user.id,
            content: renderProposalDraft(draft),
          },
        });

        noteId = note.id;

        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: "proposal_draft_generated",
            entityType: "opportunity",
            entityId: opportunity.id,
            details: {
              noteId,
              provider: draft.provider,
              model: draft.model,
            },
          },
        });
      } catch (error) {
        console.warn("Failed to persist proposal draft note:", error);
      }
    }

    return NextResponse.json({
      data: draft,
      meta: {
        persisted: Boolean(noteId),
        noteId,
        source: dbOpportunity ? "database" : "mock",
      },
      disclaimer:
        "AI proposal drafts are starting points only. Review the solicitation and validate every claim before submission.",
    });
  } catch (error) {
    console.error("Proposal draft error:", error);
    return NextResponse.json(
      { error: "Failed to generate proposal draft" },
      { status: 500 }
    );
  }
}

function renderProposalDraft(draft: ProposalDraft): string {
  const compliance = draft.complianceMatrix
    .map(
      (item) =>
        `- [${item.status}] ${item.requirement}\n  Response: ${item.response}\n  Owner: ${item.owner}`
    )
    .join("\n");

  return [
    `# ${draft.title}`,
    "",
    "## Executive Summary",
    draft.executiveSummary,
    "",
    "## Technical Approach",
    draft.technicalApproach.map((item) => `- ${item}`).join("\n"),
    "",
    "## Compliance Matrix",
    compliance || "- No compliance items generated.",
    "",
    "## Past Performance Prompts",
    draft.pastPerformancePrompts.map((item) => `- ${item}`).join("\n"),
    "",
    "## Pricing Strategy",
    draft.pricingStrategy.map((item) => `- ${item}`).join("\n"),
    "",
    "## Risk Mitigations",
    draft.riskMitigations.map((item) => `- ${item}`).join("\n"),
    "",
    "## Clarifying Questions",
    draft.clarifyingQuestions.map((item) => `- ${item}`).join("\n"),
    "",
    "## Next Actions",
    draft.nextActions.map((item, index) => `${index + 1}. ${item}`).join("\n"),
  ].join("\n");
}
