// ============================================================
// AI Service Abstraction Layer
// Supports OpenAI, AWS Bedrock, or mock provider
// ============================================================

import OpenAI from "openai";
import { Opportunity, OpportunityAnalysis, ProposalDraft } from "@/types";

export type AIProvider = "openai" | "bedrock" | "mock";

interface AIServiceConfig {
  provider: AIProvider;
  apiKey?: string;
  region?: string;
  model?: string;
}

function getConfig(): AIServiceConfig {
  const provider = (process.env.AI_PROVIDER || "mock") as AIProvider;
  return {
    provider,
    apiKey: process.env.OPENAI_API_KEY,
    region: process.env.AWS_REGION || "us-east-1",
    model: process.env.AI_MODEL || "gpt-4o-mini",
  };
}

function getOpenAIClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// ============================================================
// Core AI Functions
// ============================================================

export async function summarizeOpportunity(opportunity: Opportunity): Promise<string> {
  const config = getConfig();

  if (config.provider === "mock") {
    return mockSummarize(opportunity);
  }

  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: config.model || "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are a government contracting expert. Summarize this opportunity in plain language for a small business owner. Be concise but cover key points: what's being procured, who's buying, estimated value, key requirements, and timeline.",
      },
      {
        role: "user",
        content: `Summarize this government contract opportunity:\n\nTitle: ${opportunity.title}\nAgency: ${opportunity.agency}\nSolicitation: ${opportunity.solicitationNumber}\nNAICS: ${opportunity.naicsCode}\nSet-Aside: ${opportunity.setAsideType}\nEstimated Value: $${opportunity.estimatedValue.toLocaleString()}\nDue Date: ${opportunity.dueDate}\nDescription: ${opportunity.description}\nRequirements: ${opportunity.requirements.join(", ")}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 500,
  });

  return response.choices[0].message.content || mockSummarize(opportunity);
}

export async function analyzeBidRisk(opportunity: Opportunity): Promise<OpportunityAnalysis> {
  const config = getConfig();

  if (config.provider === "mock") {
    return mockAnalysis(opportunity);
  }

  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: config.model || "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are an expert government contracting advisor helping small businesses evaluate bid opportunities. Analyze the opportunity and return a JSON object with the following structure:
{
  "summary": "plain language summary",
  "bidRecommendation": "bid" | "no-bid" | "conditional",
  "confidenceScore": 0.0-1.0,
  "difficultyScore": 1-5,
  "complianceRequirements": ["list of compliance items needed"],
  "capitalConcerns": ["financial considerations"],
  "supplierNeeds": ["what suppliers are needed"],
  "fulfillmentRisks": ["delivery/fulfillment risks"],
  "timelineRisks": ["timeline-related risks"],
  "marginConsiderations": ["pricing/margin factors"],
  "questionsToAsk": ["questions before bidding"],
  "recommendedNextSteps": ["ordered action items"]
}
Be specific and actionable. Consider the small business perspective.`,
      },
      {
        role: "user",
        content: `Analyze this opportunity for a small business:\n\nTitle: ${opportunity.title}\nAgency: ${opportunity.agency}\nSolicitation: ${opportunity.solicitationNumber}\nNAICS: ${opportunity.naicsCode}\nPSC: ${opportunity.pscCode}\nSet-Aside: ${opportunity.setAsideType}\nEstimated Value: $${opportunity.estimatedValue.toLocaleString()}\nDue Date: ${opportunity.dueDate}\nSource: ${opportunity.source}\nDescription: ${opportunity.description}\nRequirements: ${opportunity.requirements.join("\n- ")}\nDelivery: ${opportunity.deliveryRequirements || "Not specified"}\nPlace of Performance: ${opportunity.placeOfPerformance || "Not specified"}`,
      },
    ],
    temperature: 0.4,
    max_tokens: 2000,
    response_format: { type: "json_object" },
  });

  try {
    const content = response.choices[0].message.content;
    const parsed = JSON.parse(content || "{}");

    return {
      id: `analysis-${Date.now()}`,
      opportunityId: opportunity.id,
      userId: "current-user",
      summary: parsed.summary || "",
      bidRecommendation: parsed.bidRecommendation || "conditional",
      confidenceScore: parsed.confidenceScore || 0.5,
      difficultyScore: parsed.difficultyScore || 3,
      complianceRequirements: parsed.complianceRequirements || [],
      capitalConcerns: parsed.capitalConcerns || [],
      supplierNeeds: parsed.supplierNeeds || [],
      fulfillmentRisks: parsed.fulfillmentRisks || [],
      timelineRisks: parsed.timelineRisks || [],
      marginConsiderations: parsed.marginConsiderations || [],
      questionsToAsk: parsed.questionsToAsk || [],
      recommendedNextSteps: parsed.recommendedNextSteps || [],
      createdAt: new Date().toISOString(),
    };
  } catch {
    return mockAnalysis(opportunity);
  }
}

export async function generateProposalDraft(
  opportunity: Opportunity,
  context?: {
    organizationName?: string;
    complianceScore?: number;
    certifications?: string[];
    setAsideEligibility?: string[];
  }
): Promise<ProposalDraft> {
  const config = getConfig();

  if (config.provider === "mock") {
    return mockProposalDraft(opportunity, context, config);
  }

  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: config.model || "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a senior government proposal manager. Draft a first-pass, human-review proposal response for a small business.
Return a JSON object with this shape:
{
  "title": "draft title",
  "executiveSummary": "buyer-focused summary",
  "technicalApproach": ["specific approach bullets"],
  "complianceMatrix": [
    { "requirement": "requirement", "response": "how to satisfy it", "owner": "role", "status": "ready" | "needs_input" | "gap" }
  ],
  "pastPerformancePrompts": ["specific evidence to gather"],
  "pricingStrategy": ["pricing and margin notes"],
  "riskMitigations": ["risk mitigation bullets"],
  "clarifyingQuestions": ["questions for contracting officer"],
  "nextActions": ["ordered next actions"]
}
Keep it practical. Do not invent certifications, past performance, or pricing facts. Mark unknowns as needs_input or gap.`,
      },
      {
        role: "user",
        content: `Opportunity:
Title: ${opportunity.title}
Agency: ${opportunity.agency}
Solicitation: ${opportunity.solicitationNumber}
NAICS: ${opportunity.naicsCode}
PSC: ${opportunity.pscCode}
Set-Aside: ${opportunity.setAsideType}
Estimated Value: $${opportunity.estimatedValue.toLocaleString()}
Due Date: ${opportunity.dueDate}
Description: ${opportunity.description}
Requirements:
- ${opportunity.requirements.join("\n- ")}
Delivery: ${opportunity.deliveryRequirements || "Not specified"}
Place of Performance: ${opportunity.placeOfPerformance || "Not specified"}

Organization context:
Name: ${context?.organizationName || "Unknown"}
Compliance Score: ${context?.complianceScore ?? "Unknown"}
Certifications: ${(context?.certifications || []).join(", ") || "Unknown"}
Set-Aside Eligibility: ${(context?.setAsideEligibility || []).join(", ") || "Unknown"}`,
      },
    ],
    temperature: 0.35,
    max_tokens: 2200,
    response_format: { type: "json_object" },
  });

  try {
    const parsed = JSON.parse(response.choices[0].message.content || "{}");
    return normalizeProposalDraft(parsed, opportunity, config);
  } catch {
    return mockProposalDraft(opportunity, context, config);
  }
}

export async function generateBidNoBidRecommendation(
  opportunity: Opportunity,
  complianceScore: number
): Promise<{ recommendation: "bid" | "no-bid" | "conditional"; reasoning: string }> {
  const config = getConfig();

  if (config.provider === "mock") {
    const score = opportunity.matchScore;
    if (score >= 80 && complianceScore >= 70) {
      return { recommendation: "bid", reasoning: "Strong match with good compliance readiness. Your NAICS codes align and you meet the set-aside requirements." };
    } else if (score >= 60) {
      return { recommendation: "conditional", reasoning: "Moderate match. Address compliance gaps before bidding. Consider whether you can meet all requirements within the timeline." };
    }
    return { recommendation: "no-bid", reasoning: "Low match score or significant compliance gaps. The risk-to-reward ratio doesn't favor pursuing this opportunity." };
  }

  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: config.model || "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are a government contracting advisor. Give a bid/no-bid recommendation with brief reasoning. Return JSON: {\"recommendation\": \"bid\"|\"no-bid\"|\"conditional\", \"reasoning\": \"brief explanation\"}",
      },
      {
        role: "user",
        content: `Opportunity: ${opportunity.title}\nAgency: ${opportunity.agency}\nValue: $${opportunity.estimatedValue.toLocaleString()}\nSet-Aside: ${opportunity.setAsideType}\nMatch Score: ${opportunity.matchScore}/100\nRisk Score: ${opportunity.riskScore}/100\nCompliance Readiness: ${complianceScore}/100\nDue in: ${Math.ceil((new Date(opportunity.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days`,
      },
    ],
    temperature: 0.3,
    max_tokens: 200,
    response_format: { type: "json_object" },
  });

  try {
    const parsed = JSON.parse(response.choices[0].message.content || "{}");
    return {
      recommendation: parsed.recommendation || "conditional",
      reasoning: parsed.reasoning || "Unable to determine. Please review manually.",
    };
  } catch {
    return { recommendation: "conditional", reasoning: "AI analysis unavailable. Please review manually." };
  }
}

export async function extractComplianceRequirements(text: string): Promise<string[]> {
  const config = getConfig();

  if (config.provider === "mock") {
    return [
      "SAM.gov registration required",
      "Small business certification",
      "Relevant NAICS code registration",
      "Past performance documentation",
      "Quality management system",
    ];
  }

  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: config.model || "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "Extract all compliance requirements, certifications, and eligibility criteria from this solicitation text. Return as a JSON array of strings. Be specific and actionable.",
      },
      {
        role: "user",
        content: text,
      },
    ],
    temperature: 0.2,
    max_tokens: 500,
    response_format: { type: "json_object" },
  });

  try {
    const parsed = JSON.parse(response.choices[0].message.content || "{}");
    return parsed.requirements || parsed.items || [];
  } catch {
    return ["Unable to extract requirements. Please review the document manually."];
  }
}

export async function generateSupplierQuestions(opportunity: Opportunity): Promise<string[]> {
  const config = getConfig();

  if (config.provider === "mock") {
    return [
      "What is your lead time for this quantity?",
      "Can you provide TAA-compliant products?",
      "What is your minimum order quantity?",
      "Do you offer volume discounts?",
      "What is your return/warranty policy?",
      "Can you meet the delivery schedule requirements?",
      "Do you have experience with government contracts?",
      "Can you provide product samples?",
    ];
  }

  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: config.model || "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "Generate a list of important questions to ask potential suppliers for this government contract opportunity. Focus on compliance, pricing, delivery, quality, and capacity. Return as JSON: {\"questions\": [\"...\", ...]}",
      },
      {
        role: "user",
        content: `Opportunity: ${opportunity.title}\nAgency: ${opportunity.agency}\nRequirements: ${opportunity.requirements.join(", ")}\nDelivery: ${opportunity.deliveryRequirements || "Standard"}\nQuantity/Value: $${opportunity.estimatedValue.toLocaleString()}`,
      },
    ],
    temperature: 0.4,
    max_tokens: 500,
    response_format: { type: "json_object" },
  });

  try {
    const parsed = JSON.parse(response.choices[0].message.content || "{}");
    return parsed.questions || [];
  } catch {
    return ["What is your lead time?", "Can you meet compliance requirements?", "What is your pricing for this volume?"];
  }
}

export async function explainGovConTerm(term: string): Promise<string> {
  const config = getConfig();

  if (config.provider === "mock") {
    const terms: Record<string, string> = {
      "NAICS": "North American Industry Classification System - a standard used to classify business establishments by type of economic activity. Your NAICS codes determine which opportunities you're eligible for.",
      "PSC": "Product and Service Code - a coding system used to describe products, services, and R&D purchased by the federal government.",
      "SAM": "System for Award Management - the official U.S. government system for vendor registration. You must be registered to receive federal contracts.",
      "CAGE": "Commercial and Government Entity code - a unique identifier assigned to suppliers of government agencies.",
      "UEI": "Unique Entity Identifier - replaced the DUNS number as the primary identifier for entities doing business with the government.",
      "set-aside": "A contract reserved exclusively for small businesses or specific socioeconomic categories (8(a), HUBZone, SDVOSB, WOSB).",
      "FOB": "Free On Board - determines when ownership and risk transfer from seller to buyer during shipping.",
      "FAR": "Federal Acquisition Regulation - the primary set of rules governing the federal government's purchasing process.",
      "IDIQ": "Indefinite Delivery/Indefinite Quantity - a contract type that provides for an indefinite quantity of supplies or services during a fixed period.",
    };
    return terms[term.toUpperCase()] || terms[term.toLowerCase()] || `${term} is a government contracting term. Please consult FAR for the official definition.`;
  }

  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: config.model || "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are a government contracting expert. Explain this term in plain language for a small business owner new to government contracting. Be concise but thorough. Include practical implications.",
      },
      {
        role: "user",
        content: `Explain this government contracting term: ${term}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 300,
  });

  return response.choices[0].message.content || `${term} is a government contracting term.`;
}

export async function generateNextSteps(opportunity: Opportunity, currentStage: string): Promise<string[]> {
  const config = getConfig();

  if (config.provider === "mock") {
    const stageSteps: Record<string, string[]> = {
      discovered: ["Review the full solicitation document", "Check eligibility requirements", "Verify NAICS code alignment", "Assess compliance readiness", "Run AI bid analysis"],
      under_review: ["Complete bid/no-bid analysis", "Identify potential suppliers", "Calculate preliminary margins", "Review compliance gaps", "Assign team members"],
      supplier_sourcing: ["Request quotes from qualified suppliers", "Compare supplier pricing and lead times", "Verify supplier certifications", "Negotiate volume discounts", "Confirm delivery capabilities"],
      pricing: ["Complete margin calculation", "Factor in all costs", "Determine competitive bid price", "Review pricing against market rates", "Get management approval on pricing"],
      compliance_check: ["Verify all certifications are current", "Prepare required documentation", "Complete compliance checklist", "Address any gaps identified", "Get compliance sign-off"],
      proposal_prep: ["Draft technical approach", "Compile past performance references", "Prepare pricing volume", "Review against evaluation criteria", "Internal review and quality check"],
      submitted: ["Confirm receipt of submission", "Monitor for amendments", "Prepare for potential questions", "Track evaluation timeline", "Plan for award scenario"],
    };
    return stageSteps[currentStage] || stageSteps["discovered"];
  }

  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: config.model || "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "Generate 5-7 specific, actionable next steps for a small business at this stage of the bid process. Return as JSON: {\"steps\": [\"...\", ...]}",
      },
      {
        role: "user",
        content: `Opportunity: ${opportunity.title}\nCurrent Stage: ${currentStage}\nDue Date: ${opportunity.dueDate}\nValue: $${opportunity.estimatedValue.toLocaleString()}\nRequirements: ${opportunity.requirements.join(", ")}`,
      },
    ],
    temperature: 0.4,
    max_tokens: 400,
    response_format: { type: "json_object" },
  });

  try {
    const parsed = JSON.parse(response.choices[0].message.content || "{}");
    return parsed.steps || [];
  } catch {
    return ["Review opportunity details", "Assess compliance readiness", "Contact potential suppliers"];
  }
}

export async function summarizeUploadedDocument(content: string): Promise<string> {
  const config = getConfig();

  if (config.provider === "mock") {
    return "This document contains requirements for a government procurement opportunity. Key elements include delivery schedules, quality standards, and compliance requirements. Review the specific sections for detailed specifications.";
  }

  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: config.model || "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "Summarize this government contracting document for a small business owner. Highlight: key requirements, deadlines, compliance needs, evaluation criteria, and any red flags. Be concise and actionable.",
      },
      {
        role: "user",
        content: content.slice(0, 10000), // Limit input size
      },
    ],
    temperature: 0.3,
    max_tokens: 800,
  });

  return response.choices[0].message.content || "Unable to summarize document.";
}

export async function chat(message: string, context?: Record<string, unknown>): Promise<string> {
  const config = getConfig();

  if (config.provider === "mock") {
    return mockChat(message);
  }

  const openai = getOpenAIClient();

  const systemPrompt = `You are a knowledgeable government contracting assistant helping small businesses navigate federal, state, and local procurement. You help with:
- Evaluating opportunities (bid/no-bid decisions)
- Understanding solicitation requirements
- Compliance and certification guidance
- Supplier sourcing strategies
- Pricing and margin analysis
- Proposal preparation tips
- General GovCon terminology and processes

Be concise, practical, and actionable. If you don't know something specific, say so and suggest where to find the answer. Always consider the small business perspective.

${context ? `User context: ${JSON.stringify(context)}` : ""}`;

  const response = await openai.chat.completions.create({
    model: config.model || "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ],
    temperature: 0.5,
    max_tokens: 800,
  });

  return response.choices[0].message.content || "I'm sorry, I couldn't generate a response. Please try again.";
}

// ============================================================
// Mock Implementations (for development without API keys)
// ============================================================

function mockSummarize(opportunity: Opportunity): string {
  return `This is a ${opportunity.setAsideType} opportunity from ${opportunity.agency} for ${opportunity.title.toLowerCase()}. The estimated value is $${opportunity.estimatedValue.toLocaleString()} with a response deadline of ${new Date(opportunity.dueDate).toLocaleDateString()}. The solicitation number is ${opportunity.solicitationNumber} under NAICS code ${opportunity.naicsCode}.`;
}

function mockAnalysis(opportunity: Opportunity): OpportunityAnalysis {
  return {
    id: `analysis-${Date.now()}`,
    opportunityId: opportunity.id,
    userId: "user-001",
    summary: mockSummarize(opportunity),
    bidRecommendation: opportunity.matchScore >= 75 ? "bid" : opportunity.matchScore >= 50 ? "conditional" : "no-bid",
    confidenceScore: 0.78,
    difficultyScore: opportunity.riskScore / 20,
    complianceRequirements: opportunity.requirements || [],
    capitalConcerns: [
      `Estimated upfront capital needed: $${Math.round(opportunity.estimatedValue * 0.3).toLocaleString()}`,
      "Payment terms typically Net 30-60 for government contracts",
      "May need line of credit for initial inventory purchase",
    ],
    supplierNeeds: [
      "Need reliable supplier with government contract experience",
      "Supplier must meet delivery timeline requirements",
      "Volume pricing negotiation recommended",
    ],
    fulfillmentRisks: [
      "Delivery timeline may be tight",
      "Multiple delivery locations increase logistics complexity",
      "Quality control requirements need dedicated process",
    ],
    timelineRisks: [
      `Response deadline: ${new Date(opportunity.dueDate).toLocaleDateString()}`,
      "Proposal preparation typically takes 2-3 weeks",
      "Supplier quote turnaround: 5-10 business days",
    ],
    marginConsiderations: [
      "Government contracts typically have 15-25% margins for product resale",
      "Factor in shipping, handling, and compliance costs",
      "Consider payment delay impact on cash flow",
    ],
    questionsToAsk: [
      "Is there an incumbent contractor?",
      "What is the evaluation criteria weighting?",
      "Are there any mandatory certifications beyond what's listed?",
      "What is the expected order frequency?",
      "Is there flexibility on delivery timelines?",
    ],
    recommendedNextSteps: [
      "Download and review full solicitation",
      "Verify all compliance requirements are met",
      "Request supplier quotes within 48 hours",
      "Calculate detailed margins using the calculator",
      "Prepare compliance documentation",
    ],
    createdAt: new Date().toISOString(),
  };
}

function normalizeProposalDraft(
  parsed: Partial<ProposalDraft>,
  opportunity: Opportunity,
  config: AIServiceConfig
): ProposalDraft {
  return {
    id: `proposal-draft-${Date.now()}`,
    opportunityId: opportunity.id,
    title: parsed.title || `${opportunity.title} - Proposal Draft`,
    executiveSummary: parsed.executiveSummary || mockSummarize(opportunity),
    technicalApproach: arrayOrFallback(parsed.technicalApproach, [
      "Confirm scope, delivery locations, and acceptance criteria against the full solicitation.",
      "Align supplier commitments, quality controls, and delivery milestones before final pricing.",
    ]),
    complianceMatrix: Array.isArray(parsed.complianceMatrix)
      ? parsed.complianceMatrix.map((item) => ({
          requirement: item.requirement || "Requirement review needed",
          response: item.response || "Add response after solicitation review",
          owner: item.owner || "Proposal lead",
          status: ["ready", "needs_input", "gap"].includes(item.status)
            ? item.status
            : "needs_input",
        }))
      : [],
    pastPerformancePrompts: arrayOrFallback(parsed.pastPerformancePrompts, [
      "Identify one recent project with similar product category, volume, or delivery complexity.",
    ]),
    pricingStrategy: arrayOrFallback(parsed.pricingStrategy, [
      "Build price from supplier quotes, shipping, financing cost, contingency, and target margin.",
    ]),
    riskMitigations: arrayOrFallback(parsed.riskMitigations, [
      "Use backup suppliers and an internal deadline ahead of the government response date.",
    ]),
    clarifyingQuestions: arrayOrFallback(parsed.clarifyingQuestions, [
      "Are equivalent products acceptable where brand names or specifications are referenced?",
    ]),
    nextActions: arrayOrFallback(parsed.nextActions, [
      "Review the full solicitation",
      "Request supplier quotes",
      "Fill proposal gaps marked needs_input",
    ]),
    generatedAt: new Date().toISOString(),
    provider: config.provider,
    model: config.model || "mock",
  };
}

function mockProposalDraft(
  opportunity: Opportunity,
  context: {
    organizationName?: string;
    complianceScore?: number;
    certifications?: string[];
    setAsideEligibility?: string[];
  } | undefined,
  config: AIServiceConfig
): ProposalDraft {
  const organizationName = context?.organizationName || "Your company";
  const complianceReady = (context?.complianceScore || 0) >= 75;

  return {
    id: `proposal-draft-${Date.now()}`,
    opportunityId: opportunity.id,
    title: `${opportunity.title} - Response Draft`,
    executiveSummary: `${organizationName} can support ${opportunity.agency} with a controlled, compliance-forward response for ${opportunity.title.toLowerCase()}. The proposed approach prioritizes solicitation compliance, supplier confirmation, delivery discipline, and clear quality controls before final bid submission.`,
    technicalApproach: [
      `Confirm the full scope against solicitation ${opportunity.solicitationNumber} and map each requirement to an owner before final pricing.`,
      `Source compliant products for ${opportunity.productCategory || "the required category"} from qualified suppliers with documented lead times and backup capacity.`,
      `Use a delivery plan aligned to ${opportunity.deliveryRequirements || "the stated delivery requirements"} with internal checkpoints before the government due date.`,
      "Package compliance evidence, supplier quotes, and acceptance criteria into a review-ready proposal file.",
    ],
    complianceMatrix: opportunity.requirements.slice(0, 8).map((requirement) => ({
      requirement,
      response: complianceReady
        ? "Ready for proposal response; attach current evidence before submission."
        : "Needs supporting evidence before final proposal submission.",
      owner: requirement.toLowerCase().includes("delivery")
        ? "Operations"
        : requirement.toLowerCase().includes("supplier")
          ? "Sourcing"
          : "Compliance lead",
      status: complianceReady ? "ready" : "needs_input",
    })),
    pastPerformancePrompts: [
      `Find a past order or project involving ${opportunity.productCategory || opportunity.naicsCode}.`,
      "Capture customer, period of performance, value, delivery scope, and measurable outcome.",
      "Use commercial work if federal past performance is not available, but label it clearly.",
    ],
    pricingStrategy: [
      `Start with supplier quotes against the ${formatValue(opportunity.estimatedValue)} estimated value.`,
      "Include freight, packaging, financing cost, quality checks, platform/admin overhead, and contingency.",
      "Run a no-bid threshold if gross margin falls below the organization's target after payment delay.",
    ],
    riskMitigations: [
      "Set an internal proposal deadline at least five business days before the response date.",
      "Request backup supplier quotes for any single-source or long-lead item.",
      "Create a compliance evidence checklist and block submission until every required item is attached.",
    ],
    clarifyingQuestions: [
      "Are equivalent products acceptable where specifications reference brands or standards?",
      "What evaluation weight is assigned to price versus technical approach?",
      "Are partial shipments, substitutions, or delivery schedule adjustments allowed?",
    ],
    nextActions: [
      "Download and review the full solicitation package.",
      "Assign owners for compliance, sourcing, pricing, and proposal review.",
      "Request supplier quotes within 48 hours.",
      "Draft the technical approach and attach evidence for every compliance requirement.",
      "Run final margin and risk review before bid/no-bid approval.",
    ],
    generatedAt: new Date().toISOString(),
    provider: config.provider,
    model: config.model || "mock",
  };
}

function arrayOrFallback(value: unknown, fallback: string[]): string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : fallback;
}

function formatValue(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function mockChat(message: string): string {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("bid") && lowerMessage.includes("should")) {
    return "Based on your compliance profile and the opportunity details, I'd recommend evaluating three key factors:\n\n1. **NAICS code alignment** — Does your registered code match?\n2. **Set-aside eligibility** — Do you meet the socioeconomic requirements?\n3. **Margin viability** — Can you source products at a competitive margin?\n\nUse the Margin Calculator to run the numbers, and check your Compliance Readiness score to identify any gaps. If your match score is above 75% and compliance is above 70%, it's generally worth pursuing.";
  }

  if (lowerMessage.includes("missing") || lowerMessage.includes("need")) {
    return "Based on a typical compliance profile, the most commonly missing items are:\n\n1. **Capability Statement** — Your company's resume for government buyers. This is critical.\n2. **Past Performance** — Even commercial work counts if it demonstrates relevant experience.\n3. **SBA Certifications** — 8(a), HUBZone, WOSB, or SDVOSB can open set-aside opportunities.\n\nCheck your Compliance page for your specific gaps. Would you like guidance on creating a capability statement?";
  }

  if (lowerMessage.includes("explain") || lowerMessage.includes("what is") || lowerMessage.includes("what's")) {
    return "I'd be happy to explain government contracting concepts. Here are some common terms I can help with:\n\n- **NAICS codes** — Industry classification for eligibility\n- **Set-asides** — Contracts reserved for specific business types\n- **FAR clauses** — Federal Acquisition Regulation requirements\n- **IDIQ contracts** — Indefinite delivery/quantity vehicles\n- **Past performance** — Your track record evaluation\n\nWhich term or concept would you like me to explain in detail?";
  }

  if (lowerMessage.includes("supplier") || lowerMessage.includes("source")) {
    return "When evaluating suppliers for government contracts, prioritize these factors:\n\n1. **Compliance** — Can they provide TAA/Berry Amendment compliant products?\n2. **Lead time** — Can they deliver within the contract timeline?\n3. **Volume capacity** — Can they handle the required quantities?\n4. **Documentation** — Can they provide certifications, test reports, SDS sheets?\n5. **Government experience** — Have they supported government orders before?\n\nAlways get quotes from at least 2-3 suppliers for comparison. Ask about volume discounts and payment terms.";
  }

  if (lowerMessage.includes("risk")) {
    return "Key risks to evaluate in any government opportunity:\n\n1. **Cash flow** — Government pays Net 30-60, so you need working capital upfront\n2. **Compliance** — Missing a single requirement can disqualify your bid\n3. **Delivery** — Late delivery can result in penalties or contract termination\n4. **Pricing** — Bid too high and you lose; too low and you lose money\n5. **Competition** — Check if there's an incumbent with an advantage\n6. **Scope creep** — Fixed-price contracts don't allow for cost overruns\n\nUse the AI Analyzer to get a detailed risk assessment for specific opportunities.";
  }

  return "I'm your GovCon AI Assistant. I can help you with:\n\n- **Evaluating opportunities** — Should you bid?\n- **Understanding requirements** — What does this solicitation mean?\n- **Compliance guidance** — What do you need to be eligible?\n- **Supplier strategy** — How to find and evaluate suppliers\n- **Pricing help** — How to calculate competitive margins\n- **Process questions** — How does government contracting work?\n\nWhat would you like to know?";
}

// Export singleton-style for backward compatibility
export const aiService = {
  summarizeOpportunity,
  analyzeBidRisk,
  generateProposalDraft,
  generateBidNoBidRecommendation,
  extractComplianceRequirements,
  generateSupplierQuestions,
  explainGovConTerm,
  generateNextSteps,
  summarizeUploadedDocument,
  chat,
};

export default aiService;
