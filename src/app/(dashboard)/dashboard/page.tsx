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
import { formatCurrency } from "@/lib/utils";
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
};

const highRiskItems = [
  { title: "IT Hardware - VA Medical Centers", risk: "High", reason: "SDVOSB cert needed", dueIn: "25 days" },
  { title: "Medical Supplies - PPE", risk: "High", reason: "FDA registration required", dueIn: "33 days" },
  { title: "Electrical Supplies - DOE", risk: "Medium", reason: "Buy American compliance", dueIn: "23 days" },
];

const tasksDue = [
  { title: "Get supplier quote for toner cartridges", due: "Jun 5", priority: "high" },
  { title: "Verify Berry Amendment compliance", due: "Jun 8", priority: "medium" },
  { title: "Complete margin calculation - janitorial", due: "Jun 10", priority: "high" },
  { title: "Upload capability statement", due: "Jun 12", priority: "medium" },
];

export default function DashboardPage() {
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics>(defaultMetrics);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboardMetrics() {
      try {
        const response = await fetch("/api/dashboard");
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
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Active Bids",
      value: String(dashboardMetrics.activeBids),
      change: `${dashboardMetrics.tasksDue} tasks due this week`,
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Compliance Score",
      value: `${dashboardMetrics.complianceScore}%`,
      change: dashboardMetrics.complianceScore >= 80 ? "Ready for most bids" : "Readiness gaps remain",
      icon: ShieldCheck,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Pipeline Value",
      value: formatCurrency(dashboardMetrics.estimatedRevenue),
      change: `${dashboardMetrics.highRiskOpportunities} high-risk opportunities`,
      icon: DollarSign,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Welcome back. Here&apos;s your GovCon operations overview.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{metric.title}</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{metric.value}</p>
                  <p className="mt-1 text-xs text-gray-500">{metric.change}</p>
                </div>
                <div className={`${metric.bgColor} p-3 rounded-lg`}>
                  <metric.icon className={`h-5 w-5 ${metric.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* High Risk Opportunities */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              High-Risk Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {highRiskItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                    <p className="text-xs text-gray-500">{item.reason}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Badge variant={item.risk === "High" ? "destructive" : "warning"}>
                      {item.risk}
                    </Badge>
                    <span className="text-xs text-gray-500 whitespace-nowrap">{item.dueIn}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tasks Due */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-blue-500" />
              Tasks Due
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tasksDue.map((task, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Badge variant={task.priority === "high" ? "destructive" : "secondary"}>
                      {task.priority}
                    </Badge>
                    <span className="text-xs text-gray-500 whitespace-nowrap">{task.due}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Supplier Quotes Pending */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Truck className="h-4 w-4 text-indigo-500" />
              Pending Supplier Quotes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-900">TechDirect Solutions</p>
                  <p className="text-xs text-gray-500">Dell Latitude 5540 - 200 units</p>
                </div>
                <Badge variant="warning">Pending</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-900">MedSupply International</p>
                  <p className="text-xs text-gray-500">PPE Kit - 1000 units</p>
                </div>
                <Badge variant="warning">Pending</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-900">Pacific Office Products</p>
                  <p className="text-xs text-gray-500">Toner Cartridges - 500 units</p>
                </div>
                <Badge variant="success">Received</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recommended Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Recommended Next Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardMetrics.recommendedActions.map((action, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
                    {i + 1}
                  </span>
                  <p className="text-sm text-gray-700">{action}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Progress */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Compliance Readiness</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Overall Readiness Score</span>
              <span className="text-sm font-bold text-blue-600">{dashboardMetrics.complianceScore} / 100</span>
            </div>
            <Progress value={dashboardMetrics.complianceScore} className="h-3" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
              <div className="text-center p-3 rounded-lg bg-green-50">
                <p className="text-lg font-bold text-green-700">7</p>
                <p className="text-xs text-green-600">Completed</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-amber-50">
                <p className="text-lg font-bold text-amber-700">3</p>
                <p className="text-xs text-amber-600">In Progress</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-red-50">
                <p className="text-lg font-bold text-red-700">2</p>
                <p className="text-xs text-red-600">Missing</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-blue-50">
                <p className="text-lg font-bold text-blue-700">12</p>
                <p className="text-xs text-blue-600">Total Items</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
