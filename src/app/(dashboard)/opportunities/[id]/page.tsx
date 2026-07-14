"use client";

import React, { useCallback, useEffect, useState } from "react";
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
  ClipboardList,
  Download,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate, calculateDaysUntil } from "@/lib/utils";
import type { Note, Opportunity, OpportunityAnalysis, ProposalDraft } from "@/types";

interface OpportunityResponse {
  data?: Opportunity & { estimatedValue: number | string };
  error?: string;
  meta?: { source?: string };
}

interface AnalysisResponse {
  data?: OpportunityAnalysis;
  error?: string;
}

interface ProposalDraftResponse {
  data?: ProposalDraft;
  error?: string;
  meta?: {
    persisted?: boolean;
    noteId?: string;
    source?: string;
  };
}

interface NotesResponse {
  data?: Note[];
  error?: string;
}

function normalizeOpportunity(
  opportunity: Opportunity & { estimatedValue: number | string }
): Opportunity {
  return {
    ...opportunity,
    estimatedValue: Number(opportunity.estimatedValue || 0),
    matchScore: Number(opportunity.matchScore || 0),
    riskScore: Number(opportunity.riskScore || 0),
  };
}

function paramToString(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] : value || "";
}

export default function OpportunityDetailPage() {
  const params = useParams();
  const opportunityId = paramToString(params.id);
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<OpportunityAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [proposalDraft, setProposalDraft] = useState<ProposalDraft | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [draftStatus, setDraftStatus] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [proposalNotes, setProposalNotes] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!opportunityId) return;

    const controller = new AbortController();

    async function loadOpportunity() {
      setLoading(true);
      setLoadError(null);

      try {
        const response = await fetch(`/api/opportunities/${opportunityId}`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as OpportunityResponse;

        if (!response.ok || !payload.data) {
          throw new Error(payload.error || "Opportunity not found");
        }

        setOpportunity(normalizeOpportunity(payload.data));
        setSource(payload.meta?.source || null);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setOpportunity(null);
        setLoadError(
          error instanceof Error ? error.message : "Failed to load opportunity"
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadOpportunity();

    return () => controller.abort();
  }, [opportunityId]);

  const loadProposalNotes = useCallback(
    async (id: string, signal?: AbortSignal) => {
      setNotesLoading(true);
      setNotesError(null);

      try {
        const response = await fetch(
          `/api/notes?opportunityId=${encodeURIComponent(id)}&type=proposal_draft`,
          { signal }
        );
        const payload = (await response.json()) as NotesResponse;

        if (!response.ok) {
          throw new Error(payload.error || "Failed to load saved drafts");
        }

        setProposalNotes(payload.data || []);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setProposalNotes([]);
        setNotesError(
          error instanceof Error ? error.message : "Failed to load saved drafts"
        );
      } finally {
        if (!signal?.aborted) {
          setNotesLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    if (!opportunityId) return;
    const controller = new AbortController();
    void Promise.resolve().then(() =>
      loadProposalNotes(opportunityId, controller.signal)
    );
    return () => controller.abort();
  }, [loadProposalNotes, opportunityId]);

  const handleSave = async () => {
    if (!opportunity) return;
    setSaving(true);
    setSaveError(null);

    try {
      if (saved) {
        const response = await fetch(
          `/api/opportunities/saved?opportunityId=${encodeURIComponent(opportunity.id)}`,
          { method: "DELETE" }
        );
        if (!response.ok) throw new Error("Failed to remove saved opportunity");
        setSaved(false);
      } else {
        const response = await fetch("/api/opportunities/saved", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ opportunityId: opportunity.id }),
        });
        if (!response.ok) throw new Error("Failed to save opportunity");
        setSaved(true);
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleAnalyze = async () => {
    if (!opportunity) return;
    setAnalyzing(true);
    setAnalysisError(null);

    try {
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityId: opportunity.id }),
      });
      const payload = (await response.json()) as AnalysisResponse;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error || "Analysis failed");
      }

      setAnalysis(payload.data);
    } catch (error) {
      setAnalysisError(
        error instanceof Error ? error.message : "Analysis failed"
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerateDraft = async () => {
    if (!opportunity) return;
    setDrafting(true);
    setDraftError(null);
    setDraftStatus(null);

    try {
      const response = await fetch("/api/ai/proposal-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityId: opportunity.id }),
      });
      const payload = (await response.json()) as ProposalDraftResponse;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error || "Proposal draft failed");
      }

      setProposalDraft(payload.data);
      setDraftStatus(
        payload.meta?.persisted
          ? "Draft generated and saved to opportunity notes."
          : "Draft generated."
      );
      void loadProposalNotes(opportunity.id);
    } catch (error) {
      setDraftError(
        error instanceof Error ? error.message : "Proposal draft failed"
      );
    } finally {
      setDrafting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 p-6 text-sm text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading opportunity...
        </CardContent>
      </Card>
    );
  }

  if (!opportunity || loadError) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">{loadError || "Opportunity not found."}</p>
        <Link href="/opportunities">
          <Button variant="ghost" className="mt-4">
            Back to Opportunities
          </Button>
        </Link>
      </div>
    );
  }

  const daysUntilDue = calculateDaysUntil(opportunity.dueDate);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/opportunities">
          <Button variant="ghost" size="icon" aria-label="Back to opportunities">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-bold text-gray-900">
              {opportunity.title}
            </h1>
            {source && <Badge variant="secondary">{source}</Badge>}
          </div>
          <p className="text-sm text-gray-500">
            {opportunity.solicitationNumber}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          onClick={handleSave}
          disabled={saving}
          variant={saved ? "default" : "outline"}
          className="gap-2"
        >
          <Bookmark className="h-4 w-4" />
          {saving ? "Saving..." : saved ? "Saved" : "Save"}
        </Button>
        <Button onClick={handleAnalyze} disabled={analyzing} className="gap-2">
          <Brain className="h-4 w-4" />
          {analyzing ? "Analyzing..." : "Analyze"}
        </Button>
        <Button
          onClick={handleGenerateDraft}
          disabled={drafting}
          variant="outline"
          className="gap-2"
        >
          <FileText className="h-4 w-4" />
          {drafting ? "Drafting..." : "Draft Proposal"}
        </Button>
        <Link href="/workflows">
          <Button variant="outline" className="gap-2">
            <Kanban className="h-4 w-4" />
            Workflow
          </Button>
        </Link>
        <Link href="/suppliers">
          <Button variant="outline" className="gap-2">
            <Truck className="h-4 w-4" />
            Quotes
          </Button>
        </Link>
      </div>

      {(saveError || analysisError || draftError || draftStatus) && (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            saveError || analysisError || draftError
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {saveError || analysisError || draftError || draftStatus}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard
          icon={DollarSign}
          label="Estimated Value"
          value={formatCurrency(opportunity.estimatedValue)}
          className="text-emerald-700"
        />
        <MetricCard
          icon={Calendar}
          label="Until Due"
          value={daysUntilDue >= 0 ? `${daysUntilDue} days` : "Past due"}
          className={daysUntilDue <= 14 ? "text-red-600" : "text-slate-700"}
        />
        <MetricCard
          icon={CheckCircle2}
          label="Match Score"
          value={`${opportunity.matchScore}%`}
          className="text-emerald-700"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Risk Score"
          value={`${opportunity.riskScore}%`}
          className={opportunity.riskScore >= 50 ? "text-red-600" : "text-amber-600"}
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="requirements">Requirements</TabsTrigger>
          <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
          <TabsTrigger value="proposal">Proposal Draft</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-gray-700">
                    {opportunity.description}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Key Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                    <Detail label="Agency" value={opportunity.agency} />
                    <Detail label="NAICS Code" value={opportunity.naicsCode} />
                    <Detail label="PSC Code" value={opportunity.pscCode} />
                    <div>
                      <dt className="font-medium text-gray-500">Set-Aside</dt>
                      <dd className="mt-1">
                        <Badge variant="outline">{opportunity.setAsideType}</Badge>
                      </dd>
                    </div>
                    <Detail label="Posted Date" value={formatDate(opportunity.postedDate)} />
                    <Detail label="Response Date" value={formatDate(opportunity.responseDate)} />
                    {opportunity.deliveryRequirements && (
                      <Detail label="Delivery" value={opportunity.deliveryRequirements} />
                    )}
                    {opportunity.placeOfPerformance && (
                      <div>
                        <dt className="font-medium text-gray-500">
                          Place of Performance
                        </dt>
                        <dd className="mt-1 flex items-center gap-1 text-gray-900">
                          <MapPin className="h-3 w-3" />
                          {opportunity.placeOfPerformance}
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
                    <p className="mt-3 text-sm text-gray-600">
                      {opportunity.pointOfContact}
                    </p>
                  )}
                </CardContent>
              </Card>

              {opportunity.certifications && opportunity.certifications.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Required Certifications</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {opportunity.certifications.map((cert) => (
                        <Badge key={cert} variant="secondary">
                          {cert}
                        </Badge>
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
                  <Badge variant="outline">
                    {opportunity.productCategory || "General"}
                  </Badge>
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
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span className="text-sm text-gray-700">{req}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis">
          {analysis ? (
            <AnalysisResult analysis={analysis} />
          ) : (
            <EmptyAction
              icon={Brain}
              title="No analysis yet"
              body="Run a bid analysis before final proposal review."
              action={analyzing ? "Analyzing..." : "Run Analysis"}
              loading={analyzing}
              onClick={handleAnalyze}
            />
          )}
        </TabsContent>

        <TabsContent value="proposal">
          <div className="space-y-6">
            {proposalDraft ? (
              <ProposalDraftView draft={proposalDraft} />
            ) : (
              <EmptyAction
                icon={FileText}
                title="No proposal draft yet"
                body="Generate a first-pass response from the opportunity and organization profile."
                action={drafting ? "Drafting..." : "Draft Proposal"}
                loading={drafting}
                onClick={handleGenerateDraft}
              />
            )}
            <SavedDrafts
              notes={proposalNotes}
              loading={notesLoading}
              error={notesError}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <Icon className={`mx-auto h-5 w-5 ${className || "text-slate-700"}`} />
        <p className="mt-1 text-lg font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </CardContent>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-gray-900">{value}</dd>
    </div>
  );
}

function EmptyAction({
  icon: Icon,
  title,
  body,
  action,
  loading,
  onClick,
}: {
  icon: React.ElementType;
  title: string;
  body: string;
  action: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <Card>
      <CardContent className="p-12 text-center">
        <Icon className="mx-auto h-12 w-12 text-gray-300" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">{title}</h3>
        <p className="mt-2 text-sm text-gray-500">{body}</p>
        <Button onClick={onClick} disabled={loading} className="mt-4 gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
          {action}
        </Button>
      </CardContent>
    </Card>
  );
}

function AnalysisResult({ analysis }: { analysis: OpportunityAnalysis }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-4 w-4 text-slate-700" />
            AI Bid Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge
                variant={
                  analysis.bidRecommendation === "bid"
                    ? "success"
                    : analysis.bidRecommendation === "conditional"
                      ? "warning"
                      : "destructive"
                }
                className="px-3 py-1 text-sm"
              >
                {analysis.bidRecommendation === "bid"
                  ? "Recommend Bid"
                  : analysis.bidRecommendation === "conditional"
                    ? "Conditional"
                    : "No Bid"}
              </Badge>
              <span className="text-sm text-gray-500">
                Confidence: {Math.round(analysis.confidenceScore * 100)}%
              </span>
            </div>
            <p className="text-sm text-gray-700">{analysis.summary}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <ListCard title="Capital Concerns" icon={DollarSign} items={analysis.capitalConcerns} />
        <ListCard title="Fulfillment Risks" icon={AlertTriangle} items={analysis.fulfillmentRisks} />
        <ListCard title="Questions to Ask" icon={ClipboardList} items={analysis.questionsToAsk} ordered />
        <ListCard title="Recommended Next Steps" icon={CheckCircle2} items={analysis.recommendedNextSteps} ordered />
      </div>

      <p className="text-center text-xs italic text-gray-400">
        AI analysis is for decision support only. Final decisions require human review.
      </p>
    </div>
  );
}

function ProposalDraftView({ draft }: { draft: ProposalDraft }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-slate-700" />
              {draft.title}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{formatDate(draft.generatedAt)}</Badge>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() =>
                  downloadTextFile(
                    safeFileName(`${draft.title}.md`),
                    renderProposalDraftMarkdown(draft)
                  )
                }
              >
                <Download className="h-4 w-4" />
                Markdown
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-gray-700">
            {draft.executiveSummary}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ListCard title="Technical Approach" icon={ClipboardList} items={draft.technicalApproach} />
        <ListCard title="Past Performance Prompts" icon={CheckCircle2} items={draft.pastPerformancePrompts} />
        <ListCard title="Pricing Strategy" icon={DollarSign} items={draft.pricingStrategy} />
        <ListCard title="Risk Mitigations" icon={AlertTriangle} items={draft.riskMitigations} />
        <ListCard title="Clarifying Questions" icon={ClipboardList} items={draft.clarifyingQuestions} ordered />
        <ListCard title="Next Actions" icon={CheckCircle2} items={draft.nextActions} ordered />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compliance Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {draft.complianceMatrix.map((item, index) => (
              <div key={`${item.requirement}-${index}`} className="rounded-md border border-gray-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900">
                    {item.requirement}
                  </p>
                  <Badge
                    variant={
                      item.status === "ready"
                        ? "success"
                        : item.status === "gap"
                          ? "destructive"
                          : "warning"
                    }
                  >
                    {item.status.replace("_", " ")}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-gray-700">{item.response}</p>
                <p className="mt-2 text-xs text-gray-500">Owner: {item.owner}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SavedDrafts({
  notes,
  loading,
  error,
}: {
  notes: Note[];
  loading: boolean;
  error: string | null;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4 text-slate-700" />
          Saved Proposal Drafts
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading saved drafts...
          </div>
        ) : error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : notes.length > 0 ? (
          <div className="space-y-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className="flex flex-col gap-3 rounded-md border border-gray-200 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">
                      {proposalNoteTitle(note.content)}
                    </p>
                    <Badge variant="secondary">{formatDate(note.createdAt)}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                    {proposalNotePreview(note.content)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 self-start sm:self-center"
                  onClick={() =>
                    downloadTextFile(
                      safeFileName(`${proposalNoteTitle(note.content)}.md`),
                      note.content
                    )
                  }
                >
                  <Download className="h-4 w-4" />
                  Markdown
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-gray-200 p-4 text-sm text-gray-500">
            No saved proposal drafts for this opportunity yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ListCard({
  title,
  icon: Icon,
  items,
  ordered = false,
}: {
  title: string;
  icon: React.ElementType;
  items: string[];
  ordered?: boolean;
}) {
  const List = ordered ? "ol" : "ul";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className="h-4 w-4 text-slate-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <List className="space-y-2">
          {items.map((item, index) => (
            <li key={`${title}-${index}`} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-700">
                {ordered ? (
                  index + 1
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                )}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </List>
      </CardContent>
    </Card>
  );
}

function renderProposalDraftMarkdown(draft: ProposalDraft): string {
  const compliance = draft.complianceMatrix
    .map(
      (item) =>
        `- [${item.status}] ${item.requirement}\n  Response: ${item.response}\n  Owner: ${item.owner}`
    )
    .join("\n");

  return [
    `# ${draft.title}`,
    "",
    "## Executive Summary",
    draft.executiveSummary,
    "",
    "## Technical Approach",
    draft.technicalApproach.map((item) => `- ${item}`).join("\n"),
    "",
    "## Compliance Matrix",
    compliance || "- No compliance items generated.",
    "",
    "## Past Performance Prompts",
    draft.pastPerformancePrompts.map((item) => `- ${item}`).join("\n"),
    "",
    "## Pricing Strategy",
    draft.pricingStrategy.map((item) => `- ${item}`).join("\n"),
    "",
    "## Risk Mitigations",
    draft.riskMitigations.map((item) => `- ${item}`).join("\n"),
    "",
    "## Clarifying Questions",
    draft.clarifyingQuestions.map((item) => `- ${item}`).join("\n"),
    "",
    "## Next Actions",
    draft.nextActions.map((item, index) => `${index + 1}. ${item}`).join("\n"),
  ].join("\n");
}

function proposalNoteTitle(content: string): string {
  return content.split("\n")[0]?.replace(/^#\s*/, "").trim() || "Proposal Draft";
}

function proposalNotePreview(content: string): string {
  return content
    .replace(/^# .*\n/, "")
    .replace(/#+\s*/g, "")
    .replace(/\n+/g, " ")
    .slice(0, 220);
}

function safeFileName(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || "proposal-draft.md";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
