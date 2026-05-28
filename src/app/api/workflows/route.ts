import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { mockWorkflows } from "@/data/mock-workflows";

// GET /api/workflows - List bid workflows
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const stage = searchParams.get("stage");
  const priority = searchParams.get("priority");

  try {
    const user = await getCurrentUser();

    if (user) {
      const where: any = { organizationId: user.organizationId };
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
        return NextResponse.json({ data: workflows });
      }
    }

    // Fallback to mock
    let results = [...mockWorkflows];
    if (stage) results = results.filter((wf) => wf.stage === stage);
    if (priority) results = results.filter((wf) => wf.priority === priority);

    return NextResponse.json({ data: results, meta: { source: "mock" } });
  } catch (error) {
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

    const body = await request.json();

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
      include: { opportunity: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "workflow_created",
        entityType: "bid_workflow",
        entityId: workflow.id,
        details: { opportunityId: body.opportunityId, stage: "discovered" },
      },
    });

    return NextResponse.json({ data: workflow }, { status: 201 });
  } catch (error) {
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

    const body = await request.json();
    const { id, stage, priority, notes, assignedTo } = body;

    if (!id) {
      return NextResponse.json({ error: "Workflow ID required" }, { status: 400 });
    }

    const workflow = await prisma.bidWorkflow.update({
      where: { id },
      data: {
        ...(stage && { stage }),
        ...(priority && { priority }),
        ...(notes !== undefined && { notes }),
        ...(assignedTo && { assignedTo }),
      },
      include: { opportunity: true },
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
    console.error("Update workflow error:", error);
    return NextResponse.json(
      { error: "Failed to update workflow" },
      { status: 500 }
    );
  }
}
