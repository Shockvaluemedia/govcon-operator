"use client";

import React, { useEffect, useState } from "react";
import {
  TrendingUp,
  FileSearch,
  ShieldCheck,
  DollarSign,
  AlertTriangle,
  CheckSquare,
  Truck,
  Lightbulb,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { calculateDaysUntil, formatCurrency, formatDate } from "@/lib/utils";
import type { DashboardMetrics } from "@/types";

const defaultMetrics: DashboardMetrics = {
  totalSavedOpportunities: 0,
  activeBids: 0,
  complianceScore: 0,
  estimatedRevenue: 0,
  highRiskOpportunities: 0,
  tasksDue: 0,
  pendingQuotes: 0,
  recommendedActions: ["Search for opportunities matching your NAICS codes"],
  highRiskItems: [],
  taskItems: [],
  quoteItems: [],
  complianceSummary: { completed: 0, missing: 0, total: 0, missingItems: [] },
};

export default function DashboardPage() {
  const [dashboardMetrics, setDashboardMetrics] =
    useState<DashboardMetrics>(defaultMetrics);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboardMetrics() {
      try {
        const response = await fetch("/api/dashboard", {
          headers: { "x-govcon-data-mode": "database" },
        });
        if (!response.ok) return;
        const payload = await response.json();
        if (!cancelled && payload.data) {
          setDashboardMetrics(payload.data);
        }
      } catch {
        // Keep the empty state if the dashboard metrics endpoint is unavailable.
      }
    }

    void loadDashboardMetrics();

    return () => {
      cancelled = true;
    };
  }, []);

  const metrics = [
    {
      title: "Saved Opportunities",
      value: String(dashboardMetrics.totalSavedOpportunities),
      change: "Saved to pipeline",
      icon: FileSearch,
      color: "text-slate-700",
      bgColor: "bg-slate-100",
    },
    {
      title: "Active Bids",
      value: String(dashboardMetrics.activeBids),
      change: `${dashboardMetrics.tasksDue} tasks due this week`,
      icon: TrendingUp,
      color: "text-emerald-700",
      bgColor: "bg-emerald-50",
    },
    {
      title: "Compliance Score",
      value: `${dashboardMetrics.complianceScore}%`,
      change:
        dashboardMetrics.complianceScore >= 80
          ? "Ready for most bids"
          : "Readiness gaps remain",
      icon: ShieldCheck,
      color: "text-emerald-800",
      bgColor: "bg-emerald-50",
    },
    {
      title: "Pipeline Value",
      value: formatCurrency(dashboardMetrics.estimatedRevenue),
      change: `${dashboardMetrics.highRiskOpportunities} high-risk opportunities`,
      icon: DollarSign,
      color: "text-amber-700",
      bgColor: "bg-amber-50",
    },
  ];

  const complianceSummary =
    dashboardMetrics.complianceSummary || defaultMetrics.complianceSummary!;
  const inProgressCompliance = Math.max(
    0,
    complianceSummary.total -
      complianceSummary.completed -
      complianceSummary.missing
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back. Here&apos;s your GovCon operations overview.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    {metric.title}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {metric.value}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {metric.change}
                  </p>
                </div>
                <div className={`${metric.bgColor} rounded-md p-3`}>
                  <metric.icon className={`h-5 w-5 ${metric.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              High-Risk Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardMetrics.highRiskItems?.length ? (
              <div className="space-y-3">
                {dashboardMetrics.highRiskItems.map((item) => {
                  const daysUntilDue = calculateDaysUntil(item.dueDate);

                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-md bg-gray-50 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {item.title}
                        </p>
                        <p className="text-xs text-gray-500">{item.reason}</p>
                      </div>
                      <div className="ml-4 flex items-center gap-2">
                        <Badge
                          variant={
                            item.riskScore >= 70 ? "destructive" : "warning"
                          }
                        >
                          {item.riskScore} risk
                        </Badge>
                        <span className="whitespace-nowrap text-xs text-gray-500">
                          {daysUntilDue >= 0 ? `${daysUntilDue} days` : "Past due"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                No high-risk active opportunities in the current pipeline.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <CheckSquare className="h-4 w-4 text-slate-600" />
              Tasks Due
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardMetrics.taskItems?.length ? (
              <div className="space-y-3">
                {dashboardMetrics.taskItems.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between rounded-md bg-gray-50 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {task.title}
                      </p>
                      {task.opportunityTitle && (
                        <p className="truncate text-xs text-gray-500">
                          {task.opportunityTitle}
                        </p>
                      )}
                    </div>
                    <div className="ml-4 flex items-center gap-2">
                      <Badge
                        variant={
                          task.priority === "high" ||
                          task.priority === "critical"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {task.priority}
                      </Badge>
                      {task.dueDate && (
                        <span className="whitespace-nowrap text-xs text-gray-500">
                          {formatDate(task.dueDate)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                No workflow tasks due in the next seven days.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Truck className="h-4 w-4 text-slate-600" />
              Supplier Quotes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardMetrics.quoteItems?.length ? (
              <div className="space-y-3">
                {dashboardMetrics.quoteItems.map((quote) => (
                  <div
                    key={quote.id}
                    className="flex items-center justify-between rounded-md bg-gray-50 p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {quote.supplierName}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {quote.productDescription} -{" "}
                        {formatCurrency(quote.totalPrice)}
                      </p>
                    </div>
                    <Badge
                      variant={
                        quote.status === "received" ? "success" : "warning"
                      }
                    >
                      {quote.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                No supplier quotes are waiting on this organization.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Recommended Next Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardMetrics.recommendedActions.map((action, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-md bg-gray-50 p-3"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-700">
                    {i + 1}
                  </span>
                  <p className="text-sm text-gray-700">{action}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Compliance Readiness
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Overall Readiness Score
              </span>
              <span className="text-sm font-bold text-emerald-700">
                {dashboardMetrics.complianceScore} / 100
              </span>
            </div>
            <Progress value={dashboardMetrics.complianceScore} className="h-3" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-md bg-emerald-50 p-3 text-center">
                <p className="text-lg font-bold text-emerald-700">
                  {complianceSummary.completed}
                </p>
                <p className="text-xs text-emerald-600">Completed</p>
              </div>
              <div className="rounded-md bg-amber-50 p-3 text-center">
                <p className="text-lg font-bold text-amber-700">
                  {inProgressCompliance}
                </p>
                <p className="text-xs text-amber-600">In Progress</p>
              </div>
              <div className="rounded-md bg-red-50 p-3 text-center">
                <p className="text-lg font-bold text-red-700">
                  {complianceSummary.missing}
                </p>
                <p className="text-xs text-red-600">Missing</p>
              </div>
              <div className="rounded-md bg-slate-100 p-3 text-center">
                <p className="text-lg font-bold text-slate-700">
                  {complianceSummary.total}
                </p>
                <p className="text-xs text-slate-600">Total Items</p>
              </div>
            </div>
            {complianceSummary.missingItems.length > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-amber-800">
                  Missing
                </p>
                <p className="mt-1 text-sm text-amber-900">
                  {complianceSummary.missingItems.slice(0, 4).join(", ")}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
