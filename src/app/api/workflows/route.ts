import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { databaseMeta, requiresDatabase } from "@/lib/data-mode";
import { mockWorkflows } from "@/data/mock-workflows";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

const workflowStages = [
  "discovered",
  "under_review",
  "supplier_sourcing",
  "pricing",
  "compliance_check",
  "proposal_prep",
  "submitted",
  "awarded",
  "lost",
  "fulfillment",
  "completed",
] as const;

const workflowPriorities = ["low", "medium", "high", "critical"] as const;

const createWorkflowSchema = z.object({
  opportunityId: z.string().min(1),
  stage: z.enum(workflowStages).optional(),
  assignedTo: z.string().min(1).optional().nullable(),
  priority: z.enum(workflowPriorities).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const updateWorkflowSchema = z.object({
  id: z.string().min(1),
  stage: z.enum(workflowStages).optional(),
  priority: z.enum(workflowPriorities).optional(),
  notes: z.string().optional().nullable(),
  assignedTo: z.string().min(1).optional().nullable(),
});

// GET /api/workflows - List bid workflows
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const databaseRequired = requiresDatabase(request);
  const stage = searchParams.get("stage");
  const priority = searchParams.get("priority");

  try {
    const user = await getCurrentUser();

    if (user) {
      const where: Prisma.BidWorkflowWhereInput = { organizationId: user.organizationId };
      if (stage) where.stage = stage;
      if (priority) where.priority = priority;

      const workflows = await prisma.bidWorkflow.findMany({
        where,
        include: {
          opportunity: true,
          tasks: true,
        },
        orderBy: { updatedAt: "desc" },
      });

      if (workflows.length > 0) {
        return NextResponse.json({ data: workflows, meta: databaseMeta(workflows.length) });
      }

      if (databaseRequired) {
        return NextResponse.json({ data: [], meta: databaseMeta(0) });
      }
    } else if (databaseRequired) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fallback to mock
    let results = [...mockWorkflows];
    if (stage) results = results.filter((wf) => wf.stage === stage);
    if (priority) results = results.filter((wf) => wf.priority === priority);

    return NextResponse.json({ data: results, meta: { source: "mock" } });
  } catch (error) {
    if (databaseRequired) {
      console.error("Database required for workflows but unavailable:", error);
      return NextResponse.json(
        { error: "Database unavailable", meta: { source: "database" } },
        { status: 503 }
      );
    }

    console.warn("Database unavailable for workflows:", error);
    return NextResponse.json({ data: mockWorkflows, meta: { source: "mock" } });
  }
}

// POST /api/workflows - Create a new bid workflow
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = createWorkflowSchema.parse(await request.json());

    const workflow = await prisma.bidWorkflow.create({
      data: {
        opportunityId: body.opportunityId,
        organizationId: user.organizationId,
        stage: body.stage || "discovered",
        assignedTo: body.assignedTo || user.id,
        priority: body.priority || "medium",
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        notes: body.notes,
      },
      include: { opportunity: true, tasks: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "workflow_created",
        entityType: "bid_workflow",
        entityId: workflow.id,
        details: { opportunityId: body.opportunityId, stage: body.stage || "discovered" },
      },
    });

    return NextResponse.json({ data: workflow }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid workflow details", issues: error.issues },
        { status: 400 }
      );
    }

    console.error("Create workflow error:", error);
    return NextResponse.json(
      { error: "Failed to create workflow" },
      { status: 500 }
    );
  }
}

// PATCH /api/workflows - Update workflow (stage, priority, etc.)
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = updateWorkflowSchema.parse(await request.json());
    const { id, stage, priority, notes, assignedTo } = body;

    const existingWorkflow = await prisma.bidWorkflow.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
    });

    if (!existingWorkflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    const workflow = await prisma.bidWorkflow.update({
      where: { id: existingWorkflow.id },
      data: {
        ...(stage && { stage }),
        ...(priority && { priority }),
        ...(notes !== undefined && { notes }),
        ...(assignedTo !== undefined && { assignedTo }),
      },
      include: { opportunity: true, tasks: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "workflow_updated",
        entityType: "bid_workflow",
        entityId: id,
        details: { stage, priority },
      },
    });

    return NextResponse.json({ data: workflow });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid workflow update", issues: error.issues },
        { status: 400 }
      );
    }

    console.error("Update workflow error:", error);
    return NextResponse.json(
      { error: "Failed to update workflow" },
      { status: 500 }
    );
  }
}
