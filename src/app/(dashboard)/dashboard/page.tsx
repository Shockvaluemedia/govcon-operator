"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  FileSearch,
  ShieldCheck,
  DollarSign,
  AlertTriangle,
  CheckSquare,
  Truck,
  Lightbulb,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";

interface DashboardMetrics {
  totalSavedOpportunities: number;
  activeBids: number;
  complianceScore: number;
  estimatedRevenue: number;
  highRiskOpportunities: number;
  tasksDue: number;
  pendingQuotes: number;
  recommendedActions: string[];
}

interface OpportunityRow {
  id: string;
  title: string;
  agency: string;
  dueDate: string;
  riskScore?: number | null;
  setAsideType?: string;
}

function daysUntil(dateStr: string): string {
  const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return "Past due";
  if (days === 0) return "Due today";
  return `${days} day${days === 1 ? "" : "s"}`;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [highRisk, setHighRisk] = useState<OpportunityRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [dashRes, oppsRes] = await Promise.all([
          fetch("/api/dashboard"),
          fetch("/api/opportunities?limit=50"),
        ]);

        const dash = await dashRes.json().catch(() => null);
        const opps = await oppsRes.json().catch(() => null);

        if (!active) return;

        if (dash?.data) setMetrics(dash.data);

        const rows: OpportunityRow[] = Array.isArray(opps?.data) ? opps.data : [];
        setHighRisk(
          rows
            .filter((o) => (o.riskScore ?? 0) >= 50)
            .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0))
            .slice(0, 4)
        );
      } catch {
        // Leave metrics null; the empty-state UI below handles it.
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  const cards = [
    {
      title: "Saved Opportunities",
      value: metrics ? String(metrics.totalSavedOpportunities) : "—",
      change: "Tracked for your organization",
      icon: FileSearch,
    },
    {
      title: "Active Bids",
      value: metrics ? String(metrics.activeBids) : "—",
      change: `${metrics?.tasksDue ?? 0} task${metrics?.tasksDue === 1 ? "" : "s"} due this week`,
      icon: TrendingUp,
    },
    {
      title: "Compliance Score",
      value: metrics ? `${metrics.complianceScore}%` : "—",
      change: metrics && metrics.complianceScore < 100 ? "Room to improve" : "Fully ready",
      icon: ShieldCheck,
    },
    {
      title: "Pipeline Value",
      value: metrics ? formatCurrency(metrics.estimatedRevenue) : "—",
      change: `${metrics?.activeBids ?? 0} active workflow${metrics?.activeBids === 1 ? "" : "s"}`,
      icon: DollarSign,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back. Here&apos;s your GovCon operations overview.
          </p>
        </div>
        {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((metric) => (
          <Card key={metric.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{metric.title}</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{metric.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{metric.change}</p>
                </div>
                <div className="bg-accent p-3 rounded-md">
                  <metric.icon className="h-5 w-5 text-primary" />
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
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              High-Risk Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {highRisk.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No high-risk opportunities in your current pipeline.
                </p>
              )}
              {highRisk.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-md bg-muted">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.agency}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Badge variant={(item.riskScore ?? 0) >= 70 ? "destructive" : "warning"}>
                      {(item.riskScore ?? 0) >= 70 ? "High" : "Medium"}
                    </Badge>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {daysUntil(item.dueDate)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Work summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-primary" />
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link
                href="/workflows"
                className="flex items-center justify-between p-3 rounded-md bg-muted hover:bg-accent transition-colors"
              >
                <span className="text-sm font-medium text-foreground">Tasks due in the next 7 days</span>
                <Badge variant={metrics && metrics.tasksDue > 0 ? "warning" : "secondary"}>
                  {metrics?.tasksDue ?? 0}
                </Badge>
              </Link>
              <Link
                href="/suppliers"
                className="flex items-center justify-between p-3 rounded-md bg-muted hover:bg-accent transition-colors"
              >
                <span className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  Pending supplier quotes
                </span>
                <Badge variant={metrics && metrics.pendingQuotes > 0 ? "warning" : "secondary"}>
                  {metrics?.pendingQuotes ?? 0}
                </Badge>
              </Link>
              <Link
                href="/opportunities"
                className="flex items-center justify-between p-3 rounded-md bg-muted hover:bg-accent transition-colors"
              >
                <span className="text-sm font-medium text-foreground">High-risk opportunities to review</span>
                <Badge variant={metrics && metrics.highRiskOpportunities > 0 ? "destructive" : "secondary"}>
                  {metrics?.highRiskOpportunities ?? 0}
                </Badge>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recommended Actions */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-600" />
              Recommended Next Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(metrics?.recommendedActions ?? []).map((action, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-md bg-muted">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-medium text-primary">
                    {i + 1}
                  </span>
                  <p className="text-sm text-foreground">{action}</p>
                </div>
              ))}
              {!loading && (metrics?.recommendedActions?.length ?? 0) === 0 && (
                <p className="text-sm text-muted-foreground">
                  You&apos;re all caught up. Search for new opportunities to get started.
                </p>
              )}
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
              <span className="text-sm text-muted-foreground">Overall Readiness Score</span>
              <span className="text-sm font-bold text-primary">
                {metrics ? metrics.complianceScore : 0} / 100
              </span>
            </div>
            <Progress value={metrics?.complianceScore ?? 0} className="h-3" />
            <div className="pt-2">
              <Link href="/compliance" className="text-sm font-medium text-primary hover:underline">
                Review your compliance checklist →
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
