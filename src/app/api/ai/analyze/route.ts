import { NextRequest, NextResponse } from "next/server";
import { analyzeBidRisk } from "@/services/ai-service";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { mockOpportunities } from "@/data/mock-opportunities";
import type { Opportunity } from "@/types";

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

  try {
    let opportunity: Opportunity | undefined;

    if (opportunityId) {
      // Try database first
      try {
        const dbOpp = await prisma.opportunity.findUnique({
          where: { id: opportunityId },
        });
        if (dbOpp) {
          opportunity = {
            id: dbOpp.id,
            title: dbOpp.title,
            agency: dbOpp.agency,
            solicitationNumber: dbOpp.solicitationNumber,
            naicsCode: dbOpp.naicsCode,
            pscCode: dbOpp.pscCode,
            setAsideType: dbOpp.setAsideType,
            dueDate: dbOpp.dueDate.toISOString(),
            estimatedValue: Number(dbOpp.estimatedValue),
            source: dbOpp.source as Opportunity["source"],
            status: dbOpp.status as Opportunity["status"],
            matchScore: dbOpp.matchScore || 50,
            riskScore: dbOpp.riskScore || 50,
            description: dbOpp.description || "",
            requirements: dbOpp.requirements,
            deliveryRequirements: dbOpp.deliveryRequirements || undefined,
            placeOfPerformance: dbOpp.placeOfPerformance || undefined,
            pointOfContact: dbOpp.pointOfContact || undefined,
            postedDate: dbOpp.postedDate.toISOString(),
            responseDate: dbOpp.responseDate.toISOString(),
          };
        }
      } catch {
        // Database unavailable, try mock
      }

      // Fallback to mock data
      if (!opportunity) {
        opportunity = mockOpportunities.find((opp) => opp.id === opportunityId);
      }

      if (!opportunity) {
        return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
      }
    } else {
      // Text-based analysis
      opportunity = {
        id: "custom-analysis",
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
    }

    // Run AI analysis
    const analysis = await analyzeBidRisk(opportunity);

    // Save analysis to database if user is authenticated
    try {
      const user = await getCurrentUser();
      if (user && opportunityId) {
        await prisma.opportunityAnalysis.create({
          data: {
            opportunityId: opportunity.id,
            userId: user.id,
            summary: analysis.summary,
            bidRecommendation: analysis.bidRecommendation,
            confidenceScore: analysis.confidenceScore,
            difficultyScore: analysis.difficultyScore,
            complianceRequirements: analysis.complianceRequirements,
            capitalConcerns: analysis.capitalConcerns,
            supplierNeeds: analysis.supplierNeeds,
            fulfillmentRisks: analysis.fulfillmentRisks,
            timelineRisks: analysis.timelineRisks,
            marginConsiderations: analysis.marginConsiderations,
            questionsToAsk: analysis.questionsToAsk,
            recommendedNextSteps: analysis.recommendedNextSteps,
            aiProvider: process.env.AI_PROVIDER || "mock",
            aiModel: process.env.AI_MODEL || "mock",
          },
        });

        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: "ai_analysis_created",
            entityType: "opportunity_analysis",
            entityId: opportunity.id,
            details: {
              recommendation: analysis.bidRecommendation,
              confidence: analysis.confidenceScore,
            },
          },
        });
      }
    } catch (dbError) {
      // Don't fail the request if database save fails
      console.warn("Failed to save analysis to database:", dbError);
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
