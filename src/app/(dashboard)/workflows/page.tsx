"use client";

import React from "react";
import { Calendar, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockWorkflows } from "@/data/mock-workflows";
import { formatCurrency, formatDate } from "@/lib/utils";
import { WorkflowStage } from "@/types";

const stages: { key: WorkflowStage; label: string; color: string }[] = [
  { key: "discovered", label: "Discovered", color: "bg-gray-100" },
  { key: "under_review", label: "Under Review", color: "bg-blue-50" },
  { key: "supplier_sourcing", label: "Supplier Sourcing", color: "bg-indigo-50" },
  { key: "pricing", label: "Pricing", color: "bg-purple-50" },
  { key: "compliance_check", label: "Compliance Check", color: "bg-amber-50" },
  { key: "proposal_prep", label: "Proposal Prep", color: "bg-orange-50" },
  { key: "submitted", label: "Submitted", color: "bg-cyan-50" },
  { key: "awarded", label: "Awarded", color: "bg-green-50" },
  { key: "lost", label: "Lost", color: "bg-red-50" },
  { key: "fulfillment", label: "Fulfillment", color: "bg-teal-50" },
  { key: "completed", label: "Completed", color: "bg-emerald-50" },
];

export default function WorkflowsPage() {
  const activeStages = stages.filter((stage) =>
    mockWorkflows.some((wf) => wf.stage === stage.key) ||
    ["discovered", "under_review", "supplier_sourcing", "pricing", "compliance_check", "proposal_prep", "submitted"].includes(stage.key)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bid Workflow Board</h1>
        <p className="text-sm text-gray-500 mt-1">
          Track opportunities through your bidding pipeline
        </p>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {activeStages.map((stage) => {
            const stageWorkflows = mockWorkflows.filter((wf) => wf.stage === stage.key);

            return (
              <div key={stage.key} className="w-72 flex-shrink-0">
                <div className={`rounded-lg ${stage.color} p-3`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-700">{stage.label}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {stageWorkflows.length}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    {stageWorkflows.map((workflow) => (
                      <Card key={workflow.id} className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="p-3">
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-900 line-clamp-2">
                              {workflow.opportunity.title}
                            </p>
                            <p className="text-xs text-gray-500">
                              {workflow.opportunity.agency}
                            </p>
                            <div className="flex items-center justify-between">
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
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Calendar className="h-3 w-3" />
                                Due: {formatDate(workflow.dueDate)}
                              </div>
                            )}
                            {workflow.notes && (
                              <p className="text-xs text-gray-400 italic line-clamp-2">
                                {workflow.notes}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {stageWorkflows.length === 0 && (
                      <div className="text-center py-8 text-xs text-gray-400">
                        No items
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-gray-50">
              <p className="text-2xl font-bold text-gray-900">{mockWorkflows.length}</p>
              <p className="text-xs text-gray-500">Total in Pipeline</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-gray-50">
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(mockWorkflows.reduce((sum, wf) => sum + wf.opportunity.estimatedValue, 0))}
              </p>
              <p className="text-xs text-gray-500">Total Pipeline Value</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-gray-50">
              <p className="text-2xl font-bold text-amber-600">
                {mockWorkflows.filter((wf) => wf.priority === "high" || wf.priority === "critical").length}
              </p>
              <p className="text-xs text-gray-500">High Priority</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-gray-50">
              <p className="text-2xl font-bold text-blue-600">
                {mockWorkflows.filter((wf) => wf.dueDate && new Date(wf.dueDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).length}
              </p>
              <p className="text-xs text-gray-500">Due This Week</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
