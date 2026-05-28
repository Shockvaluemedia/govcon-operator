import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/services/ai-service";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";

// POST /api/ai/chat - Send message to AI assistant
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { message, sessionId } = body;

  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const currentSessionId = sessionId || uuidv4();

  try {
    // Get user context for personalized responses
    let context: Record<string, unknown> = {};
    let userId = "anonymous";

    try {
      const user = await getCurrentUser();
      if (user) {
        userId = user.id;

        // Build context from user's data
        const [complianceProfile, savedOpps, workflows] = await Promise.all([
          prisma.complianceProfile.findUnique({
            where: { organizationId: user.organizationId },
          }).catch(() => null),
          prisma.savedOpportunity.count({
            where: { userId: user.id },
          }).catch(() => 0),
          prisma.bidWorkflow.count({
            where: { organizationId: user.organizationId },
          }).catch(() => 0),
        ]);

        context = {
          complianceScore: complianceProfile?.readinessScore || 0,
          savedOpportunities: savedOpps,
          activeWorkflows: workflows,
          role: user.role,
        };
      }
    } catch {
      // Continue without user context
    }

    // Get AI response
    const response = await chat(message, context);

    // Save messages to database
    try {
      if (userId !== "anonymous") {
        await prisma.aIMessage.createMany({
          data: [
            {
              role: "user",
              content: message,
              userId,
              sessionId: currentSessionId,
            },
            {
              role: "assistant",
              content: response,
              userId,
              sessionId: currentSessionId,
            },
          ],
        });
      }
    } catch {
      // Don't fail if message save fails
    }

    return NextResponse.json({
      data: {
        message: response,
        sessionId: currentSessionId,
      },
    });
  } catch (error) {
    console.error("AI chat error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
