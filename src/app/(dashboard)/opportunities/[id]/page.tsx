"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Building,
  MapPin,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Brain,
  Truck,
  FileText,
  Bookmark,
  Kanban,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockOpportunities } from "@/data/mock-opportunities";
import { formatCurrency, formatDate, calculateDaysUntil } from "@/lib/utils";
import { OpportunityAnalysis } from "@/types";

export default function OpportunityDetailPage() {
  const params = useParams();
  const opportunity = mockOpportunities.find((opp) => opp.id === params.id);
  const [analysis, setAnalysis] = useState<OpportunityAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!opportunity) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Opportunity not found.</p>
        <Link href="/opportunities">
          <Button variant="ghost" className="mt-4">Back to Opportunities</Button>
        </Link>
      </div>
    );
  }

  const daysUntilDue = calculateDaysUntil(opportunity.dueDate);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (saved) {
        await fetch(`/api/opportunities/saved?opportunityId=${opportunity.id}`, { method: "DELETE" });
        setSaved(false);
      } else {
        await fetch("/api/opportunities/saved", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ opportunityId: opportunity.id }),
        });
        setSaved(true);
      }
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityId: opportunity.id }),
      });
      const data = await res.json();
      setAnalysis(data.data);
    } catch (error) {
      console.error("Analysis error:", error);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back button and header */}
      <div className="flex items-center gap-4">
        <Link href="/opportunities">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{opportunity.title}</h1>
          <p className="text-sm text-gray-500">{opportunity.solicitationNumber}</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={handleSave} disabled={saving} variant={saved ? "default" : "outline"} className="gap-2">
          <Bookmark className="h-4 w-4" />
          {saving ? "Saving..." : saved ? "Saved" : "Save Opportunity"}
        </Button>
        <Button onClick={handleAnalyze} disabled={analyzing} className="gap-2">
          <Brain className="h-4 w-4" />
          {analyzing ? "Analyzing..." : "Run AI Analysis"}
        </Button>
        <Link href="/workflows">
          <Button variant="outline" className="gap-2">
            <Kanban className="h-4 w-4" />
            Start Bid Workflow
          </Button>
        </Link>
        <Link href="/suppliers">
          <Button variant="outline" className="gap-2">
            <Truck className="h-4 w-4" />
            Request Supplier Quotes
          </Button>
        </Link>
        <Button variant="outline" className="gap-2">
          <FileText className="h-4 w-4" />
          Add Note
        </Button>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="h-5 w-5 text-green-600 mx-auto" />
            <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(opportunity.estimatedValue)}</p>
            <p className="text-xs text-gray-500">Estimated Value</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="h-5 w-5 text-primary mx-auto" />
            <p className="text-lg font-bold text-gray-900 mt-1">{daysUntilDue} days</p>
            <p className="text-xs text-gray-500">Until Due</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto" />
            <p className="text-lg font-bold text-gray-900 mt-1">{opportunity.matchScore}%</p>
            <p className="text-xs text-gray-500">Match Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-5 w-5 text-amber-500 mx-auto" />
            <p className="text-lg font-bold text-gray-900 mt-1">{opportunity.riskScore}%</p>
            <p className="text-xs text-gray-500">Risk Score</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="requirements">Requirements</TabsTrigger>
          <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 leading-relaxed">{opportunity.description}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Key Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="font-medium text-gray-500">Agency</dt>
                      <dd className="mt-1 text-gray-900">{opportunity.agency}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">NAICS Code</dt>
                      <dd className="mt-1 text-gray-900">{opportunity.naicsCode}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">PSC Code</dt>
                      <dd className="mt-1 text-gray-900">{opportunity.pscCode}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">Set-Aside</dt>
                      <dd className="mt-1"><Badge variant="outline">{opportunity.setAsideType}</Badge></dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">Posted Date</dt>
                      <dd className="mt-1 text-gray-900">{formatDate(opportunity.postedDate)}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">Response Date</dt>
                      <dd className="mt-1 text-gray-900">{formatDate(opportunity.responseDate)}</dd>
                    </div>
                    {opportunity.deliveryRequirements && (
                      <div>
                        <dt className="font-medium text-gray-500">Delivery</dt>
                        <dd className="mt-1 text-gray-900">{opportunity.deliveryRequirements}</dd>
                      </div>
                    )}
                    {opportunity.placeOfPerformance && (
                      <div>
                        <dt className="font-medium text-gray-500">Place of Performance</dt>
                        <dd className="mt-1 text-gray-900 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{opportunity.placeOfPerformance}
                        </dd>
                      </div>
                    )}
                  </dl>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Source</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-gray-400" />
                    <Badge variant="info">{opportunity.source}</Badge>
                  </div>
                  {opportunity.pointOfContact && (
                    <p className="mt-3 text-sm text-gray-600">{opportunity.pointOfContact}</p>
                  )}
                </CardContent>
              </Card>

              {opportunity.certifications && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Required Certifications</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {opportunity.certifications.map((cert) => (
                        <Badge key={cert} variant="secondary">{cert}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Product Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline">{opportunity.productCategory || "General"}</Badge>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="requirements">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Requirements & Eligibility</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {opportunity.requirements.map((req, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span className="text-sm text-gray-700">{req}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis">
          {analysis ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    AI Bid Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={analysis.bidRecommendation === "bid" ? "success" : analysis.bidRecommendation === "conditional" ? "warning" : "destructive"}
                        className="text-sm px-3 py-1"
                      >
                        {analysis.bidRecommendation === "bid" ? "✓ Recommend Bid" : analysis.bidRecommendation === "conditional" ? "⚠ Conditional" : "✗ No Bid"}
                      </Badge>
                      <span className="text-sm text-gray-500">Confidence: {Math.round(analysis.confidenceScore * 100)}%</span>
                    </div>
                    <p className="text-sm text-gray-700">{analysis.summary}</p>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Capital Concerns</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.capitalConcerns.map((item, i) => (
                        <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                          <DollarSign className="h-3 w-3 mt-1 text-amber-500 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-sm">Fulfillment Risks</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.fulfillmentRisks.map((item, i) => (
                        <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                          <AlertTriangle className="h-3 w-3 mt-1 text-red-500 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-sm">Questions to Ask</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.questionsToAsk.map((item, i) => (
                        <li key={i} className="text-sm text-gray-700">• {item}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-sm">Recommended Next Steps</CardTitle></CardHeader>
                  <CardContent>
                    <ol className="space-y-2">
                      {analysis.recommendedNextSteps.map((item, i) => (
                        <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-medium text-primary">{i + 1}</span>
                          {item}
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              </div>

              <p className="text-xs text-gray-400 italic text-center">
                AI analysis is for decision support only. Final decisions require human review.
              </p>
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Brain className="h-12 w-12 text-gray-300 mx-auto" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">No analysis yet</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Click &quot;Run AI Analysis&quot; to get a detailed bid evaluation.
                </p>
                <Button onClick={handleAnalyze} disabled={analyzing} className="mt-4 gap-2">
                  <Brain className="h-4 w-4" />
                  {analyzing ? "Analyzing..." : "Run AI Analysis"}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
