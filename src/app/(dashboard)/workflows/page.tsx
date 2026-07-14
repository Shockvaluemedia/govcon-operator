"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertTriangle,
  ArrowUpRight,
  Brain,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  FileText,
  GripVertical,
  ListChecks,
  Truck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import type {
  BidWorkflow,
  Note,
  Opportunity,
  OpportunityAnalysis,
  SupplierQuote,
  WorkflowStage,
  WorkflowTask,
} from "@/types";

const stages: { key: WorkflowStage; label: string; color: string }[] = [
  { key: "discovered", label: "Discovered", color: "bg-slate-100" },
  { key: "under_review", label: "Under Review", color: "bg-slate-50" },
  { key: "supplier_sourcing", label: "Supplier Sourcing", color: "bg-emerald-50" },
  { key: "pricing", label: "Pricing", color: "bg-amber-50" },
  { key: "compliance_check", label: "Compliance Check", color: "bg-amber-50" },
  { key: "proposal_prep", label: "Proposal Prep", color: "bg-stone-50" },
  { key: "submitted", label: "Submitted", color: "bg-sky-50" },
  { key: "awarded", label: "Awarded", color: "bg-emerald-50" },
  { key: "lost", label: "Lost", color: "bg-red-50" },
  { key: "fulfillment", label: "Fulfillment", color: "bg-teal-50" },
  { key: "completed", label: "Completed", color: "bg-emerald-50" },
];

const defaultStageKeys: WorkflowStage[] = [
  "discovered",
  "under_review",
  "supplier_sourcing",
  "pricing",
  "compliance_check",
  "proposal_prep",
  "submitted",
];

type ApiOpportunity = Omit<Opportunity, "estimatedValue"> & {
  estimatedValue: number | string;
  analyses?: OpportunityAnalysis[];
  notes?: Note[];
  supplierQuotes?: ApiSupplierQuote[];
};

type ApiSupplierQuote = SupplierQuote & {
  supplier?: { name: string };
};

type CommandOpportunity = Opportunity & {
  analyses: OpportunityAnalysis[];
  notes: Note[];
  supplierQuotes: ApiSupplierQuote[];
};

type CommandWorkflow = Omit<BidWorkflow, "opportunity" | "tasks"> & {
  opportunity: CommandOpportunity;
  tasks?: WorkflowTask[];
};

type ApiWorkflow = Omit<BidWorkflow, "opportunity" | "tasks"> & {
  opportunity: ApiOpportunity;
  tasks?: WorkflowTask[];
};

interface WorkflowsResponse {
  data?: ApiWorkflow[] | ApiWorkflow;
  error?: string;
  meta?: {
    source?: string;
    total?: number;
  };
}

function normalizeWorkflow(workflow: ApiWorkflow): CommandWorkflow {
  return {
    ...workflow,
    opportunity: {
      ...workflow.opportunity,
      estimatedValue: Number(workflow.opportunity.estimatedValue || 0),
      analyses: workflow.opportunity.analyses || [],
      notes: workflow.opportunity.notes || [],
      supplierQuotes: workflow.opportunity.supplierQuotes || [],
    },
    tasks: workflow.tasks || [],
  };
}

function stageLabel(stageKey: WorkflowStage) {
  return stages.find((stage) => stage.key === stageKey)?.label || stageKey;
}

function adjacentStage(stageKey: WorkflowStage, direction: -1 | 1) {
  const currentIndex = stages.findIndex((stage) => stage.key === stageKey);
  return stages[currentIndex + direction]?.key || null;
}

function sortOpenTasks(tasks: WorkflowTask[]) {
  return [...tasks]
    .filter((task) => task.status !== "completed")
    .sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return a.createdAt.localeCompare(b.createdAt);
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
}

function getWorkflowCommand(workflow: CommandWorkflow) {
  const latestAnalysis = workflow.opportunity.analyses[0];
  const quotes = workflow.opportunity.supplierQuotes;
  const draftCount = workflow.opportunity.notes.length;
  const nextTask = sortOpenTasks(workflow.tasks || [])[0];

  if (!latestAnalysis) {
    return {
      label: "Run bid analysis",
      detail: "No bid/no-bid proof yet",
      tone: "warning" as const,
    };
  }

  if (workflow.stage === "supplier_sourcing" && quotes.length === 0) {
    return {
      label: "Request supplier quotes",
      detail: "Sourcing proof missing",
      tone: "warning" as const,
    };
  }

  if (workflow.stage === "proposal_prep" && draftCount === 0) {
    return {
      label: "Draft proposal",
      detail: "No saved draft yet",
      tone: "warning" as const,
    };
  }

  if (nextTask) {
    return {
      label: nextTask.title,
      detail: nextTask.dueDate ? `Due ${formatDate(nextTask.dueDate)}` : "Next open task",
      tone: nextTask.dueDate && new Date(nextTask.dueDate) < new Date()
        ? ("destructive" as const)
        : ("secondary" as const),
    };
  }

  return {
    label: "Ready for stage review",
    detail: "All visible tasks complete",
    tone: "success" as const,
  };
}

function WorkflowCard({
  workflow,
  isDragging,
  updating,
  onMove,
}: {
  workflow: CommandWorkflow;
  isDragging?: boolean;
  updating?: boolean;
  onMove: (workflow: CommandWorkflow, stage: WorkflowStage) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: workflow.id,
    data: { workflow },
  });
  const tasks = workflow.tasks || [];
  const completedTaskCount = tasks.filter((task) => task.status === "completed").length;
  const previousStage = adjacentStage(workflow.stage, -1);
  const nextStage = adjacentStage(workflow.stage, 1);
  const latestAnalysis = workflow.opportunity.analyses[0];
  const quoteCount = workflow.opportunity.supplierQuotes.length;
  const receivedQuoteCount = workflow.opportunity.supplierQuotes.filter(
    (quote) => quote.status === "received" || quote.status === "accepted"
  ).length;
  const draftCount = workflow.opportunity.notes.length;
  const command = getWorkflowCommand(workflow);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card className="cursor-grab transition-shadow hover:shadow-md active:cursor-grabbing">
        <CardContent className="p-3">
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <button
                {...listeners}
                aria-label="Drag to reorder"
                className="mt-0.5 text-gray-400 hover:text-gray-600"
                type="button"
              >
                <GripVertical className="h-4 w-4" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-medium text-gray-900">
                  {workflow.opportunity.title}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
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
              <div className="flex items-center gap-1 pl-6 text-xs text-gray-500">
                <Calendar className="h-3 w-3" />
                Due: {formatDate(workflow.dueDate)}
              </div>
            )}

            <div className="flex items-center gap-1 pl-6 text-xs text-gray-500">
              <ListChecks className="h-3 w-3" />
              {tasks.length > 0 ? `${completedTaskCount}/${tasks.length} tasks complete` : "No tasks yet"}
            </div>

            <div className="grid grid-cols-3 gap-1 pl-6 text-xs">
              <Badge
                variant={
                  latestAnalysis?.bidRecommendation === "bid"
                    ? "success"
                    : latestAnalysis?.bidRecommendation === "no-bid"
                      ? "destructive"
                      : "warning"
                }
                className="justify-center gap-1 truncate"
              >
                <Brain className="h-3 w-3" />
                {latestAnalysis?.bidRecommendation || "No AI"}
              </Badge>
              <Badge
                variant={receivedQuoteCount > 0 ? "success" : quoteCount > 0 ? "warning" : "secondary"}
                className="justify-center gap-1 truncate"
              >
                <Truck className="h-3 w-3" />
                {receivedQuoteCount}/{quoteCount}
              </Badge>
              <Badge
                variant={draftCount > 0 ? "success" : "secondary"}
                className="justify-center gap-1 truncate"
              >
                <FileText className="h-3 w-3" />
                {draftCount}
              </Badge>
            </div>

            <div className="rounded-md border border-gray-200 bg-white p-2 pl-2">
              <div className="flex items-start gap-2">
                {command.tone === "destructive" ? (
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
                ) : command.tone === "warning" ? (
                  <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                ) : (
                  <ListChecks className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600" />
                )}
                <div className="min-w-0">
                  <p className="line-clamp-1 text-xs font-medium text-gray-900">
                    {command.label}
                  </p>
                  <p className="line-clamp-1 text-xs text-gray-500">{command.detail}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pl-6 pt-1">
              <Button asChild className="h-7 px-2" size="sm" variant="ghost">
                <Link href={`/opportunities/${workflow.opportunity.id}`} aria-label={`Open ${workflow.opportunity.title}`}>
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </Button>
              <Button
                aria-label={`Move ${workflow.opportunity.title} to ${previousStage ? stageLabel(previousStage) : "previous stage"}`}
                className="h-7 px-2"
                disabled={!previousStage || updating}
                onClick={() => previousStage && onMove(workflow, previousStage)}
                size="sm"
                type="button"
                variant="outline"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button
                aria-label={`Move ${workflow.opportunity.title} to ${nextStage ? stageLabel(nextStage) : "next stage"}`}
                className="h-7 flex-1 gap-1 px-2"
                disabled={!nextStage || updating}
                onClick={() => nextStage && onMove(workflow, nextStage)}
                size="sm"
                type="button"
                variant="outline"
              >
                Next
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StageColumn({
  stage,
  workflows,
  updatingWorkflowId,
  onMove,
}: {
  stage: { key: WorkflowStage; label: string; color: string };
  workflows: CommandWorkflow[];
  updatingWorkflowId: string | null;
  onMove: (workflow: CommandWorkflow, stage: WorkflowStage) => void;
}) {
  return (
    <div className="w-72 flex-shrink-0">
      <div className={`min-h-[200px] rounded-lg ${stage.color} p-3`}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">{stage.label}</h3>
          <Badge variant="secondary" className="text-xs">
            {workflows.length}
          </Badge>
        </div>

        <SortableContext
          items={workflows.map((wf) => wf.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="min-h-[100px] space-y-3">
            {workflows.map((workflow) => (
              <WorkflowCard
                key={workflow.id}
                workflow={workflow}
                updating={updatingWorkflowId === workflow.id}
                onMove={onMove}
              />
            ))}
            {workflows.length === 0 && (
              <div className="rounded-lg border-2 border-dashed border-gray-200 py-8 text-center text-xs text-gray-400">
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
  const [workflows, setWorkflows] = useState<CommandWorkflow[]>([]);
  const [activeWorkflow, setActiveWorkflow] = useState<CommandWorkflow | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updatingWorkflowId, setUpdatingWorkflowId] = useState<string | null>(null);
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

  const fetchWorkflows = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/workflows", {
      headers: { "x-govcon-data-mode": "database" },
      signal,
    });
    const payload = (await response.json()) as WorkflowsResponse;

    if (!response.ok) {
      throw new Error(payload.error || "Failed to load workflows");
    }

    return payload;
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadWorkflowBoard() {
      setLoading(true);
      setError(null);

      try {
        const payload = await fetchWorkflows(controller.signal);
        const workflowData = Array.isArray(payload.data) ? payload.data : [];

        setWorkflows(workflowData.map(normalizeWorkflow));
        setSource(payload.meta?.source || null);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setWorkflows([]);
        setSource(null);
        setError(err instanceof Error ? err.message : "Failed to load workflows");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadWorkflowBoard();

    return () => controller.abort();
  }, [fetchWorkflows]);

  const updateWorkflowStage = useCallback(async (workflow: CommandWorkflow, targetStage: WorkflowStage) => {
    if (workflow.stage === targetStage) return;

    setUpdateError(null);
    setUpdatingWorkflowId(workflow.id);

    setWorkflows((prev) =>
      prev.map((wf) =>
        wf.id === workflow.id ? { ...wf, stage: targetStage } : wf
      )
    );

    try {
      const response = await fetch("/api/workflows", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-govcon-data-mode": "database",
        },
        body: JSON.stringify({ id: workflow.id, stage: targetStage }),
      });
      const payload = (await response.json()) as WorkflowsResponse;

      if (!response.ok || Array.isArray(payload.data) || !payload.data) {
        throw new Error(payload.error || "Failed to update workflow stage");
      }

      setWorkflows((prev) =>
        prev.map((wf) =>
          wf.id === workflow.id ? normalizeWorkflow(payload.data as ApiWorkflow) : wf
        )
      );
    } catch (err) {
      setWorkflows((prev) =>
        prev.map((wf) =>
          wf.id === workflow.id ? { ...wf, stage: workflow.stage } : wf
        )
      );
      setUpdateError(err instanceof Error ? err.message : "Failed to update workflow stage");
    } finally {
      setUpdatingWorkflowId(null);
    }
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    const wf = workflows.find((workflow) => workflow.id === event.active.id);
    setActiveWorkflow(wf || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveWorkflow(null);

    const { active, over } = event;
    if (!over) return;

    const activeWorkflowItem = workflows.find((workflow) => workflow.id === active.id);
    if (!activeWorkflowItem) return;

    const stageMatch = stages.find((stage) => stage.key === over.id);
    const overWorkflow = workflows.find((workflow) => workflow.id === over.id);
    const targetStage = stageMatch?.key || overWorkflow?.stage || null;

    if (!targetStage || activeWorkflowItem.stage === targetStage) return;

    await updateWorkflowStage(activeWorkflowItem, targetStage);
  };

  const activeStages = useMemo(() => {
    return stages.filter((stage) =>
      workflows.some((workflow) => workflow.stage === stage.key) ||
      defaultStageKeys.includes(stage.key)
    );
  }, [workflows]);

  const dueThisWeekCount = workflows.filter((workflow) => {
    return workflow.dueDate && new Date(workflow.dueDate) < dueThisWeekCutoff;
  }).length;
  const totalTaskCount = workflows.reduce((sum, workflow) => sum + (workflow.tasks?.length || 0), 0);
  const completedTaskCount = workflows.reduce(
    (sum, workflow) => sum + (workflow.tasks || []).filter((task) => task.status === "completed").length,
    0
  );
  const actionNeededCount = workflows.filter((workflow) => {
    const tone = getWorkflowCommand(workflow).tone;
    return tone === "warning" || tone === "destructive";
  }).length;
  const quoteCount = workflows.reduce(
    (sum, workflow) => sum + workflow.opportunity.supplierQuotes.length,
    0
  );
  const proposalDraftCount = workflows.reduce(
    (sum, workflow) => sum + workflow.opportunity.notes.length,
    0
  );

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bid Workflow Board</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track bid stages, next actions, proof, and pipeline value
          </p>
        </div>
        <Badge variant={source === "database" ? "success" : "secondary"} className="w-fit">
          {loading ? "Loading..." : `${workflows.length} database workflows`}
        </Badge>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-red-700">Unable to load workflows</p>
            <p className="mt-1 text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {updateError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-red-700">Unable to update workflow</p>
            <p className="mt-1 text-sm text-red-600">{updateError}</p>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-gray-500">Loading workflows...</p>
          </CardContent>
        </Card>
      )}

      {!loading && !error && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="overflow-x-auto pb-4">
            <div className="flex min-w-max gap-4">
              {activeStages.map((stage) => {
                const stageWorkflows = workflows.filter((workflow) => workflow.stage === stage.key);
                return (
                  <StageColumn
                    key={stage.key}
                    stage={stage}
                    workflows={stageWorkflows}
                    updatingWorkflowId={updatingWorkflowId}
                    onMove={updateWorkflowStage}
                  />
                );
              })}
            </div>
          </div>

          <DragOverlay>
            {activeWorkflow && (
              <div className="w-72">
                <Card className="border-blue-200 shadow-lg">
                  <CardContent className="p-3">
                    <p className="line-clamp-2 text-sm font-medium text-gray-900">
                      {activeWorkflow.opportunity.title}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {formatCurrency(activeWorkflow.opportunity.estimatedValue)}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-7">
            <div className="rounded-md bg-slate-50 p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">{workflows.length}</p>
              <p className="text-xs text-gray-500">Total in Pipeline</p>
            </div>
            <div className="rounded-md bg-slate-50 p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(workflows.reduce((sum, workflow) => sum + workflow.opportunity.estimatedValue, 0))}
              </p>
              <p className="text-xs text-gray-500">Pipeline Value</p>
            </div>
            <div className="rounded-md bg-amber-50 p-3 text-center">
              <p className="text-2xl font-bold text-amber-700">{actionNeededCount}</p>
              <p className="text-xs text-amber-700">Need Action</p>
            </div>
            <div className="rounded-md bg-amber-50 p-3 text-center">
              <p className="text-2xl font-bold text-amber-600">
                {workflows.filter((workflow) => workflow.priority === "high" || workflow.priority === "critical").length}
              </p>
              <p className="text-xs text-gray-500">High Priority</p>
            </div>
            <div className="rounded-md bg-slate-50 p-3 text-center">
              <p className="text-2xl font-bold text-slate-700">{dueThisWeekCount}</p>
              <p className="text-xs text-gray-500">Due This Week</p>
            </div>
            <div className="rounded-md bg-emerald-50 p-3 text-center">
              <p className="text-2xl font-bold text-emerald-700">{quoteCount}</p>
              <p className="text-xs text-emerald-700">Quotes</p>
            </div>
            <div className="rounded-md bg-slate-50 p-3 text-center">
              <p className="text-2xl font-bold text-slate-700">{proposalDraftCount}</p>
              <p className="text-xs text-gray-500">Drafts</p>
            </div>
            <div className="rounded-md bg-emerald-50 p-3 text-center">
              <p className="text-2xl font-bold text-emerald-700">
                {completedTaskCount}/{totalTaskCount}
              </p>
              <p className="text-xs text-emerald-700">Tasks</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
