"use client";

import React, { useState, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, DollarSign, GripVertical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockWorkflows } from "@/data/mock-workflows";
import { formatCurrency, formatDate } from "@/lib/utils";
import { BidWorkflow, WorkflowStage } from "@/types";

const stages: { key: WorkflowStage; label: string; color: string }[] = [
  { key: "discovered", label: "Discovered", color: "bg-gray-100" },
  { key: "under_review", label: "Under Review", color: "bg-slate-100" },
  { key: "supplier_sourcing", label: "Supplier Sourcing", color: "bg-slate-50" },
  { key: "pricing", label: "Pricing", color: "bg-gray-50" },
  { key: "compliance_check", label: "Compliance Check", color: "bg-amber-50" },
  { key: "proposal_prep", label: "Proposal Prep", color: "bg-amber-100" },
  { key: "submitted", label: "Submitted", color: "bg-green-50" },
  { key: "awarded", label: "Awarded", color: "bg-green-100" },
  { key: "lost", label: "Lost", color: "bg-red-50" },
  { key: "fulfillment", label: "Fulfillment", color: "bg-emerald-50" },
  { key: "completed", label: "Completed", color: "bg-emerald-100" },
];

// Sortable workflow card
function WorkflowCard({ workflow, isDragging }: { workflow: BidWorkflow; isDragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: workflow.id,
    data: { workflow },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow">
        <CardContent className="p-3">
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <button {...listeners} className="mt-0.5 text-gray-400 hover:text-gray-600" aria-label="Drag to reorder">
                <GripVertical className="h-4 w-4" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 line-clamp-2">
                  {workflow.opportunity.title}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {workflow.opportunity.agency}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between pl-6">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <DollarSign className="h-3 w-3" />
                {formatCurrency(workflow.opportunity.estimatedValue)}
              </div>
              <Badge
                variant={
                  workflow.priority === "critical" ? "destructive" :
                  workflow.priority === "high" ? "warning" :
                  workflow.priority === "medium" ? "info" : "secondary"
                }
                className="text-xs"
              >
                {workflow.priority}
              </Badge>
            </div>
            {workflow.dueDate && (
              <div className="flex items-center gap-1 text-xs text-gray-500 pl-6">
                <Calendar className="h-3 w-3" />
                Due: {formatDate(workflow.dueDate)}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Droppable column
function StageColumn({
  stage,
  workflows,
}: {
  stage: { key: WorkflowStage; label: string; color: string };
  workflows: BidWorkflow[];
}) {
  return (
    <div className="w-72 flex-shrink-0">
      <div className={`rounded-lg ${stage.color} p-3 min-h-[200px]`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">{stage.label}</h3>
          <Badge variant="secondary" className="text-xs">
            {workflows.length}
          </Badge>
        </div>

        <SortableContext
          items={workflows.map((wf) => wf.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3 min-h-[100px]">
            {workflows.map((workflow) => (
              <WorkflowCard key={workflow.id} workflow={workflow} />
            ))}
            {workflows.length === 0 && (
              <div className="text-center py-8 text-xs text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                Drop here
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<BidWorkflow[]>(mockWorkflows);
  const [activeWorkflow, setActiveWorkflow] = useState<BidWorkflow | null>(null);
  const [dueThisWeekCutoff] = useState(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + 7);
    return cutoff;
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  // Fetch workflows from API
  useEffect(() => {
    async function fetchWorkflows() {
      try {
        const res = await fetch("/api/workflows");
        const data = await res.json();
        if (data.data && data.data.length > 0) {
          setWorkflows(data.data);
        }
      } catch {
        // Keep mock data
      }
    }
    fetchWorkflows();
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    const wf = workflows.find((w) => w.id === event.active.id);
    setActiveWorkflow(wf || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveWorkflow(null);

    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Determine target stage
    let targetStage: WorkflowStage | null = null;

    // Check if dropped on a stage column
    const stageMatch = stages.find((s) => s.key === overId);
    if (stageMatch) {
      targetStage = stageMatch.key;
    } else {
      // Dropped on another card - find that card's stage
      const overWorkflow = workflows.find((w) => w.id === overId);
      if (overWorkflow) {
        targetStage = overWorkflow.stage;
      }
    }

    if (!targetStage) return;

    const activeWorkflowItem = workflows.find((w) => w.id === activeId);
    if (!activeWorkflowItem || activeWorkflowItem.stage === targetStage) return;

    // Update local state immediately (optimistic)
    setWorkflows((prev) =>
      prev.map((wf) =>
        wf.id === activeId ? { ...wf, stage: targetStage! } : wf
      )
    );

    // Persist to API
    try {
      await fetch("/api/workflows", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: activeId, stage: targetStage }),
      });
    } catch (error) {
      console.error("Failed to update workflow stage:", error);
      // Revert on failure
      setWorkflows((prev) =>
        prev.map((wf) =>
          wf.id === activeId ? { ...wf, stage: activeWorkflowItem.stage } : wf
        )
      );
    }
  };

  const activeStages = stages.filter((stage) =>
    workflows.some((wf) => wf.stage === stage.key) ||
    ["discovered", "under_review", "supplier_sourcing", "pricing", "compliance_check", "proposal_prep", "submitted"].includes(stage.key)
  );
  const dueThisWeekCount = workflows.filter((wf) => wf.dueDate && new Date(wf.dueDate) < dueThisWeekCutoff).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bid Workflow Board</h1>
        <p className="text-sm text-gray-500 mt-1">
          Drag opportunities between stages to track your bidding pipeline
        </p>
      </div>

      {/* Kanban Board with DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {activeStages.map((stage) => {
              const stageWorkflows = workflows.filter((wf) => wf.stage === stage.key);
              return (
                <StageColumn
                  key={stage.key}
                  stage={stage}
                  workflows={stageWorkflows}
                />
              );
            })}
          </div>
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {activeWorkflow && (
            <div className="w-72">
              <Card className="shadow-lg border-ring">
                <CardContent className="p-3">
                  <p className="text-sm font-medium text-gray-900 line-clamp-2">
                    {activeWorkflow.opportunity.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatCurrency(activeWorkflow.opportunity.estimatedValue)}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-gray-50">
              <p className="text-2xl font-bold text-gray-900">{workflows.length}</p>
              <p className="text-xs text-gray-500">Total in Pipeline</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-gray-50">
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(workflows.reduce((sum, wf) => sum + wf.opportunity.estimatedValue, 0))}
              </p>
              <p className="text-xs text-gray-500">Total Pipeline Value</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-gray-50">
              <p className="text-2xl font-bold text-amber-600">
                {workflows.filter((wf) => wf.priority === "high" || wf.priority === "critical").length}
              </p>
              <p className="text-xs text-gray-500">High Priority</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-gray-50">
              <p className="text-2xl font-bold text-primary">
                {dueThisWeekCount}
              </p>
              <p className="text-xs text-gray-500">Due This Week</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
