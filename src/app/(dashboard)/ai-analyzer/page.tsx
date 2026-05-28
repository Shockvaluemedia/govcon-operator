"use client";

import React, { useState } from "react";
import { Brain, Upload, AlertTriangle, CheckCircle2, DollarSign, Clock, Truck, HelpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface AnalysisResult {
  summary: string;
  recommendation: "bid" | "no-bid" | "conditional";
  confidence: number;
  difficulty: number;
  complianceRequirements: string[];
  capitalConcerns: string[];
  supplierNeeds: string[];
  fulfillmentRisks: string[];
  timelineRisks: string[];
  marginConsiderations: string[];
  questionsToAsk: string[];
  nextSteps: string[];
}

export default function AIAnalyzerPage() {
  const [input, setInput] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleAnalyze = async () => {
    if (!input.trim()) return;
    setAnalyzing(true);

    // Simulate AI analysis delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    setResult({
      summary: "This opportunity is for the supply of office products and toner cartridges to a federal agency. It's a firm-fixed-price contract set aside for small businesses with a base year and four option years. The estimated value suggests a mid-size procurement suitable for small business suppliers with established distribution capabilities.",
      recommendation: "bid",
      confidence: 82,
      difficulty: 3,
      complianceRequirements: [
        "Active SAM.gov registration",
        "Small business size standard under NAICS 424120",
        "CAGE code required",
        "Berry Amendment compliance for applicable items",
        "ISO 9001 certification preferred but not mandatory",
      ],
      capitalConcerns: [
        "Estimated upfront inventory investment: $35,000-$50,000",
        "Government payment terms typically Net 30-60",
        "May need working capital line of credit",
        "Option years provide revenue predictability",
      ],
      supplierNeeds: [
        "Reliable toner cartridge manufacturer or distributor",
        "Paper products supplier with bulk pricing",
        "Supplier must support Berry Amendment compliance",
        "Need backup supplier for supply chain resilience",
      ],
      fulfillmentRisks: [
        "Multiple delivery locations increase logistics complexity",
        "30-day delivery requirement is achievable but tight for initial orders",
        "95% fill rate requirement needs strong inventory management",
        "Surge ordering capability may strain small business resources",
      ],
      timelineRisks: [
        "Response deadline requires 2-3 weeks for proposal preparation",
        "Supplier quote turnaround: 5-7 business days",
        "Need to factor in compliance document preparation time",
        "Award to performance start may be 30-60 days",
      ],
      marginConsiderations: [
        "Office supplies typically yield 15-25% gross margins in government",
        "Volume pricing from suppliers can improve margins by 5-8%",
        "Shipping costs to multiple locations will impact net margin",
        "Option years provide opportunity for margin improvement through efficiency",
      ],
      questionsToAsk: [
        "Is there an incumbent contractor? What was their pricing?",
        "What is the typical monthly order volume?",
        "Are there specific brand requirements or is generic acceptable?",
        "What is the evaluation criteria weighting (price vs. technical)?",
        "Is there flexibility on the 30-day delivery requirement?",
        "What is the expected surge order frequency?",
      ],
      nextSteps: [
        "Download and review the full solicitation document",
        "Verify SAM.gov registration is current",
        "Request quotes from 2-3 qualified suppliers",
        "Calculate detailed margins using the Margin Calculator",
        "Prepare compliance documentation checklist",
        "Draft technical approach for proposal",
        "Identify past performance references",
        "Set internal deadline 5 days before submission",
      ],
    });
    setAnalyzing(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Bid Analyzer</h1>
        <p className="text-sm text-gray-500 mt-1">
          Paste an opportunity description or upload documents for AI-powered analysis
        </p>
      </div>

      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Opportunity Description</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Paste the opportunity description, solicitation text, or key requirements here..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="min-h-[200px]"
          />
          <div className="flex items-center gap-3">
            <Button onClick={handleAnalyze} disabled={analyzing || !input.trim()} className="gap-2">
              <Brain className="h-4 w-4" />
              {analyzing ? "Analyzing..." : "Analyze Opportunity"}
            </Button>
            <Button variant="outline" className="gap-2">
              <Upload className="h-4 w-4" />
              Upload Document
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Recommendation Banner */}
          <Card className={
            result.recommendation === "bid" ? "border-green-200 bg-green-50" :
            result.recommendation === "conditional" ? "border-amber-200 bg-amber-50" :
            "border-red-200 bg-red-50"
          }>
            <CardContent className="p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <Badge
                    variant={result.recommendation === "bid" ? "success" : result.recommendation === "conditional" ? "warning" : "destructive"}
                    className="text-sm px-4 py-1.5"
                  >
                    {result.recommendation === "bid" ? "✓ RECOMMEND BID" : result.recommendation === "conditional" ? "⚠ CONDITIONAL BID" : "✗ NO BID"}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    Confidence: <strong>{result.confidence}%</strong>
                  </span>
                  <span className="text-sm text-gray-600">
                    Difficulty: <strong>{result.difficulty}/5</strong>
                  </span>
                </div>
              </div>
              <p className="mt-4 text-sm text-gray-700">{result.summary}</p>
            </CardContent>
          </Card>

          {/* Analysis Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-500" />
                  Compliance Requirements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.complianceRequirements.map((item, i) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  Capital & Cash Flow
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.capitalConcerns.map((item, i) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500 mt-2 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Truck className="h-4 w-4 text-indigo-500" />
                  Supplier Needs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.supplierNeeds.map((item, i) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Fulfillment Risks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.fulfillmentRisks.map((item, i) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500 mt-2 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  Timeline Risks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.timelineRisks.map((item, i) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                  Margin Considerations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.marginConsiderations.map((item, i) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-purple-500" />
                  Questions to Ask Before Bidding
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.questionsToAsk.map((item, i) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-purple-500 font-medium text-xs">{i + 1}.</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-500" />
                  Recommended Next Steps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2">
                  {result.nextSteps.map((item, i) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">{i + 1}</span>
                      {item}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>

          {/* Disclaimer */}
          <p className="text-xs text-gray-400 italic text-center py-4">
            AI analysis is for decision support only. Final decisions require human review.
          </p>
        </div>
      )}
    </div>
  );
}
