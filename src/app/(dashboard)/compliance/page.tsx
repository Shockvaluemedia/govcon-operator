"use client";

import React from "react";
import { ShieldCheck, CheckCircle2, Circle, AlertCircle, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { complianceChecklist, mockComplianceProfile } from "@/data/mock-compliance";

export default function CompliancePage() {
  const completedCount = complianceChecklist.filter((item) => item.completed).length;
  const totalCount = complianceChecklist.length;
  const score = mockComplianceProfile.readinessScore;

  const categories = [
    { key: "registration", label: "Registration", icon: "📋" },
    { key: "documentation", label: "Documentation", icon: "📄" },
    { key: "certification", label: "Certifications", icon: "🏆" },
    { key: "financial", label: "Financial", icon: "💰" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Compliance Readiness</h1>
        <p className="text-sm text-gray-500 mt-1">
          Track your compliance status and readiness for government contracting
        </p>
      </div>

      {/* Score Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <ShieldCheck className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Readiness Score</h2>
                <p className="text-sm text-gray-500">{completedCount} of {totalCount} items completed</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold text-blue-600">{score}</p>
              <p className="text-sm text-gray-500">out of 100</p>
            </div>
          </div>
          <Progress value={score} className="h-3" />
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div className="p-2 rounded-lg bg-green-50">
              <p className="text-lg font-bold text-green-700">{completedCount}</p>
              <p className="text-xs text-green-600">Completed</p>
            </div>
            <div className="p-2 rounded-lg bg-amber-50">
              <p className="text-lg font-bold text-amber-700">{totalCount - completedCount}</p>
              <p className="text-xs text-amber-600">Remaining</p>
            </div>
            <div className="p-2 rounded-lg bg-blue-50">
              <p className="text-lg font-bold text-blue-700">{totalCount}</p>
              <p className="text-xs text-blue-600">Total Items</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checklist by Category */}
      <div className="space-y-6">
        {categories.map((category) => {
          const items = complianceChecklist.filter((item) => item.category === category.key);
          const categoryCompleted = items.filter((item) => item.completed).length;

          return (
            <Card key={category.key}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span>{category.icon}</span>
                    {category.label}
                  </CardTitle>
                  <Badge variant={categoryCompleted === items.length ? "success" : "secondary"}>
                    {categoryCompleted}/{items.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-start gap-3 p-3 rounded-lg ${
                        item.completed ? "bg-green-50" : "bg-gray-50"
                      }`}
                    >
                      {item.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-300 mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-medium ${item.completed ? "text-green-800" : "text-gray-900"}`}>
                            {item.label}
                          </p>
                          {item.priority === "required" && !item.completed && (
                            <Badge variant="destructive" className="text-xs">Required</Badge>
                          )}
                          {item.priority === "recommended" && !item.completed && (
                            <Badge variant="warning" className="text-xs">Recommended</Badge>
                          )}
                          {item.priority === "optional" && !item.completed && (
                            <Badge variant="secondary" className="text-xs">Optional</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                        {item.helpUrl && !item.completed && (
                          <Button variant="link" size="sm" className="h-auto p-0 mt-1 text-xs gap-1">
                            <ExternalLink className="h-3 w-3" /> Get started
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-blue-500" />
            Tips to Improve Your Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">1.</span>
              Create a Capability Statement — this is your company&apos;s resume for government buyers.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">2.</span>
              Document any past performance, even commercial work that demonstrates relevant experience.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">3.</span>
              Explore SBA certifications (8(a), HUBZone, WOSB) to access set-aside opportunities.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
