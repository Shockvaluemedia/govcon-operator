import { NextRequest, NextResponse } from "next/server";
import { mockWorkflows, mockWorkflowTasks } from "@/data/mock-workflows";

// GET /api/workflows - List workflows
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const stage = searchParams.get("stage");
  const priority = searchParams.get("priority");

  let results = [...mockWorkflows];

  if (stage) {
    results = results.filter((wf) => wf.stage === stage);
  }

  if (priority) {
    results = results.filter((wf) => wf.priority === priority);
  }

  return NextResponse.json({ data: results });
}

// POST /api/workflows - Create workflow
export async function POST(request: NextRequest) {
  const body = await request.json();

  const newWorkflow = {
    id: `wf-${Date.now()}`,
    stage: "discovered",
    priority: "medium",
    ...body,
    organizationId: "org-001",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json({ data: newWorkflow }, { status: 201 });
}

// PATCH /api/workflows - Update workflow stage
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, stage, priority, notes } = body;

  const workflow = mockWorkflows.find((wf) => wf.id === id);
  if (!workflow) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  }

  const updated = {
    ...workflow,
    ...(stage && { stage }),
    ...(priority && { priority }),
    ...(notes && { notes }),
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json({ data: updated });
}
