"use client";

import React from "react";
import { Users, Building, Brain, Kanban, AlertTriangle, Activity, Plug, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const adminMetrics = [
  { title: "Total Users", value: "24", icon: Users, color: "text-primary", bg: "bg-accent" },
  { title: "Organizations", value: "8", icon: Building, color: "text-primary", bg: "bg-accent" },
  { title: "AI Analyses Run", value: "156", icon: Brain, color: "text-primary", bg: "bg-accent" },
  { title: "Active Workflows", value: "32", icon: Kanban, color: "text-primary", bg: "bg-accent" },
];

const recentActivity = [
  { user: "Jane Doe", action: "Ran AI analysis on SPE7LX-24-R-0142", time: "2 min ago" },
  { user: "John Smith", action: "Uploaded capability statement", time: "15 min ago" },
  { user: "Sarah Johnson", action: "Created new bid workflow", time: "1 hour ago" },
  { user: "Mike Brown", action: "Added supplier: TechDirect Solutions", time: "2 hours ago" },
  { user: "Lisa Chen", action: "Completed compliance checklist item", time: "3 hours ago" },
];

const riskyBids = [
  { title: "IT Hardware - VA Medical Centers", org: "Acme Corp", risk: "High", reason: "Missing SDVOSB cert" },
  { title: "Medical Supplies - PPE", org: "HealthFirst LLC", risk: "High", reason: "No FDA registration" },
  { title: "Electrical Supplies - DOE", org: "Acme Corp", risk: "Medium", reason: "Buy American gap" },
];

const integrations = [
  { name: "SAM.gov", status: "connected", lastSync: "2 hours ago" },
  { name: "DLA DIBBS", status: "connected", lastSync: "4 hours ago" },
  { name: "FPDS", status: "disconnected", lastSync: "Never" },
  { name: "USAspending", status: "disconnected", lastSync: "Never" },
];

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Platform overview and management</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {adminMetrics.map((metric) => (
          <Card key={metric.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{metric.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{metric.value}</p>
                </div>
                <div className={`${metric.bg} p-3 rounded-lg`}>
                  <metric.icon className={`h-5 w-5 ${metric.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Recent Platform Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((activity, i) => (
                <div key={i} className="flex items-start justify-between p-3 rounded-lg bg-gray-50">
                  <div>
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{activity.user}</span>
                    </p>
                    <p className="text-xs text-gray-500">{activity.action}</p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Risky Bids */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Risky Bids Across Platform
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {riskyBids.map((bid, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{bid.title}</p>
                    <p className="text-xs text-gray-500">{bid.org} — {bid.reason}</p>
                  </div>
                  <Badge variant={bid.risk === "High" ? "destructive" : "warning"}>
                    {bid.risk}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Integration Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Plug className="h-4 w-4 text-slate-500" />
              Integration Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {integrations.map((integration) => (
                <div key={integration.name} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{integration.name}</p>
                    <p className="text-xs text-gray-500">Last sync: {integration.lastSync}</p>
                  </div>
                  <Badge variant={integration.status === "connected" ? "success" : "secondary"}>
                    {integration.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* AI Usage */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-green-500" />
              AI Usage This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Bid Analyses</span>
                <span className="text-sm font-medium">89</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Document Summaries</span>
                <span className="text-sm font-medium">34</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Chat Messages</span>
                <span className="text-sm font-medium">256</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Compliance Extractions</span>
                <span className="text-sm font-medium">45</span>
              </div>
              <div className="border-t pt-3 flex justify-between items-center">
                <span className="text-sm font-medium text-gray-900">Total API Calls</span>
                <span className="text-sm font-bold text-primary">424</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
