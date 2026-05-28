// ============================================================
// AI Service Abstraction Layer
// Supports OpenAI, AWS Bedrock, or other compatible providers
// ============================================================

import { Opportunity, OpportunityAnalysis } from "@/types";

export type AIProvider = "openai" | "bedrock" | "mock";

interface AIServiceConfig {
  provider: AIProvider;
  apiKey?: string;
  region?: string;
  model?: string;
}

const defaultConfig: AIServiceConfig = {
  provider: "mock",
};

class AIService {
  private config: AIServiceConfig;

  constructor(config: AIServiceConfig = defaultConfig) {
    this.config = config;
  }

  async summarizeOpportunity(opportunity: Opportunity): Promise<string> {
    if (this.config.provider === "mock") {
      return this.mockSummarize(opportunity);
    }
    // Real implementation would call the AI provider
    return this.callProvider("summarize", { opportunity });
  }

  async analyzeBidRisk(opportunity: Opportunity): Promise<OpportunityAnalysis> {
    if (this.config.provider === "mock") {
      return this.mockAnalysis(opportunity);
    }
    return this.callProvider("analyzeBidRisk", { opportunity });
  }

  async generateBidNoBidRecommendation(
    opportunity: Opportunity,
    complianceScore: number
  ): Promise<{ recommendation: "bid" | "no-bid" | "conditional"; reasoning: string }> {
    if (this.config.provider === "mock") {
      const score = opportunity.matchScore;
      if (score >= 80 && complianceScore >= 70) {
        return { recommendation: "bid", reasoning: "Strong match with good compliance readiness." };
      } else if (score >= 60) {
        return { recommendation: "conditional", reasoning: "Moderate match. Address compliance gaps before bidding." };
      }
      return { recommendation: "no-bid", reasoning: "Low match score or significant compliance gaps." };
    }
    return this.callProvider("bidNoBid", { opportunity, complianceScore });
  }

  async extractComplianceRequirements(text: string): Promise<string[]> {
    if (this.config.provider === "mock") {
      return [
        "SAM.gov registration required",
        "Small business certification",
        "Relevant NAICS code registration",
        "Past performance documentation",
        "Quality management system",
      ];
    }
    return this.callProvider("extractCompliance", { text });
  }

  async generateSupplierQuestions(opportunity: Opportunity): Promise<string[]> {
    if (this.config.provider === "mock") {
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
    return this.callProvider("supplierQuestions", { opportunity });
  }

  async calculateOpportunityFit(
    opportunity: Opportunity,
    organizationProfile: Record<string, unknown>
  ): Promise<{ score: number; factors: string[] }> {
    if (this.config.provider === "mock") {
      return {
        score: opportunity.matchScore,
        factors: [
          "NAICS code alignment",
          "Set-aside eligibility",
          "Contract value within range",
          "Product category match",
          "Geographic proximity",
        ],
      };
    }
    return this.callProvider("opportunityFit", { opportunity, organizationProfile });
  }

  async explainGovConTerm(term: string): Promise<string> {
    if (this.config.provider === "mock") {
      const terms: Record<string, string> = {
        "NAICS": "North American Industry Classification System - a standard used to classify business establishments by type of economic activity.",
        "PSC": "Product and Service Code - a coding system used to describe products, services, and R&D purchased by the federal government.",
        "SAM": "System for Award Management - the official U.S. government system for vendor registration.",
        "CAGE": "Commercial and Government Entity code - a unique identifier assigned to suppliers of government agencies.",
        "UEI": "Unique Entity Identifier - replaced the DUNS number as the primary identifier for entities doing business with the government.",
        "set-aside": "A contract reserved exclusively for small businesses or specific socioeconomic categories.",
        "FOB": "Free On Board - determines when ownership and risk transfer from seller to buyer during shipping.",
      };
      return terms[term] || `${term} is a government contracting term. Please consult FAR for the official definition.`;
    }
    return this.callProvider("explainTerm", { term });
  }

  async generateNextSteps(opportunity: Opportunity, currentStage: string): Promise<string[]> {
    if (this.config.provider === "mock") {
      const stageSteps: Record<string, string[]> = {
        discovered: [
          "Review the full solicitation document",
          "Check eligibility requirements",
          "Verify NAICS code alignment",
          "Assess compliance readiness",
          "Run AI bid analysis",
        ],
        under_review: [
          "Complete bid/no-bid analysis",
          "Identify potential suppliers",
          "Calculate preliminary margins",
          "Review compliance gaps",
          "Assign team members",
        ],
        supplier_sourcing: [
          "Request quotes from qualified suppliers",
          "Compare supplier pricing and lead times",
          "Verify supplier certifications",
          "Negotiate volume discounts",
          "Confirm delivery capabilities",
        ],
        pricing: [
          "Complete margin calculation",
          "Factor in all costs (shipping, labor, contingency)",
          "Determine competitive bid price",
          "Review pricing against market rates",
          "Get management approval on pricing",
        ],
      };
      return stageSteps[currentStage] || stageSteps["discovered"];
    }
    return this.callProvider("nextSteps", { opportunity, currentStage });
  }

  async summarizeUploadedDocument(content: string): Promise<string> {
    if (this.config.provider === "mock") {
      return "This document contains requirements for a government procurement opportunity. Key elements include delivery schedules, quality standards, and compliance requirements. Review the specific sections for detailed specifications.";
    }
    return this.callProvider("summarizeDocument", { content });
  }

  async chat(message: string, context?: Record<string, unknown>): Promise<string> {
    if (this.config.provider === "mock") {
      return this.mockChat(message);
    }
    return this.callProvider("chat", { message, context });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async callProvider(action: string, params: Record<string, unknown>): Promise<any> {
    switch (this.config.provider) {
      case "openai":
        return this.callOpenAI(action, params);
      case "bedrock":
        return this.callBedrock(action, params);
      default:
        throw new Error(`Unsupported AI provider: ${this.config.provider}`);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async callOpenAI(_action: string, _params: Record<string, unknown>): Promise<unknown> {
    // Implementation for OpenAI API calls
    // Would use fetch to call OpenAI API with appropriate prompts
    throw new Error("OpenAI integration not yet implemented. Set provider to 'mock' for development.");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async callBedrock(_action: string, _params: Record<string, unknown>): Promise<unknown> {
    // Implementation for AWS Bedrock API calls
    // Would use AWS SDK to call Bedrock with appropriate prompts
    throw new Error("Bedrock integration not yet implemented. Set provider to 'mock' for development.");
  }

  private mockSummarize(opportunity: Opportunity): string {
    return `This is a ${opportunity.setAsideType} opportunity from ${opportunity.agency} for ${opportunity.title.toLowerCase()}. The estimated value is $${opportunity.estimatedValue.toLocaleString()} with a response deadline of ${new Date(opportunity.dueDate).toLocaleDateString()}. The solicitation number is ${opportunity.solicitationNumber} under NAICS code ${opportunity.naicsCode}.`;
  }

  private mockAnalysis(opportunity: Opportunity): OpportunityAnalysis {
    return {
      id: `analysis-${Date.now()}`,
      opportunityId: opportunity.id,
      userId: "user-001",
      summary: this.mockSummarize(opportunity),
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

  private mockChat(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes("bid") && lowerMessage.includes("should")) {
      return "Based on your compliance profile and the opportunity details, I'd recommend evaluating three key factors: 1) Does your NAICS code align? 2) Do you meet the set-aside requirements? 3) Can you source the products at a competitive margin? Use the Margin Calculator to run the numbers, and check your Compliance Readiness score to identify any gaps.";
    }

    if (lowerMessage.includes("missing") || lowerMessage.includes("need")) {
      return "Based on your current compliance profile, you're missing: a Capability Statement and Past Performance documentation. These are critical for most government bids. I'd recommend creating a capability statement first — it's your company's resume for government buyers. Would you like guidance on what to include?";
    }

    if (lowerMessage.includes("explain") || lowerMessage.includes("what is")) {
      return "I'd be happy to explain that. In government contracting, terms can be confusing. Could you specify which term or concept you'd like me to explain? I can help with things like NAICS codes, set-asides, FAR clauses, contract types, or procurement processes.";
    }

    if (lowerMessage.includes("supplier") || lowerMessage.includes("source")) {
      return "When evaluating suppliers for government contracts, consider: 1) Can they meet the required delivery timelines? 2) Are their products compliant (TAA, Berry Amendment, etc.)? 3) What's their MOQ and can you negotiate volume pricing? 4) Do they have experience with government orders? 5) Can they provide required certifications and documentation?";
    }

    if (lowerMessage.includes("risk")) {
      return "Key risks to evaluate in any government opportunity: 1) Cash flow — government pays Net 30-60, so you need working capital. 2) Compliance — missing a requirement can disqualify your bid. 3) Delivery — late delivery can result in penalties. 4) Pricing — bid too high and you lose, too low and you lose money. 5) Competition — check if there's an incumbent with an advantage.";
    }

    return "I'm your GovCon AI Assistant. I can help you evaluate opportunities, understand requirements, assess risks, find suppliers, and navigate the government contracting process. What would you like to know?";
  }
}

// Singleton instance
export const aiService = new AIService(defaultConfig);
export default AIService;
