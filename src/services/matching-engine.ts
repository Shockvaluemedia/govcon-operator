// ============================================================
// Opportunity Matching Engine
// Scores opportunities against user's profile, NAICS codes,
// set-aside eligibility, and compliance readiness
// ============================================================

import { Opportunity, ComplianceProfile } from "@/types";

interface OrganizationProfile {
  naicsCodes: string[];
  pscCodes: string[];
  setAsideEligibility: string[];
  complianceScore: number;
  certifications: string[];
  productCategories?: string[];
  preferredAgencies?: string[];
  maxContractValue?: number;
  minContractValue?: number;
}

interface MatchResult {
  matchScore: number;
  riskScore: number;
  factors: MatchFactor[];
}

interface MatchFactor {
  name: string;
  score: number; // 0-100
  weight: number; // 0-1
  detail: string;
}

/**
 * Calculate match and risk scores for an opportunity against an organization profile
 */
export function scoreOpportunity(
  opportunity: Opportunity,
  profile: OrganizationProfile
): MatchResult {
  const factors: MatchFactor[] = [];

  // 1. NAICS Code Match (weight: 0.25)
  const naicsScore = scoreNAICSMatch(opportunity.naicsCode, profile.naicsCodes);
  factors.push({
    name: "NAICS Code",
    score: naicsScore,
    weight: 0.25,
    detail: naicsScore === 100
      ? `Direct match: ${opportunity.naicsCode}`
      : naicsScore >= 50
      ? `Related code: ${opportunity.naicsCode}`
      : `No match for ${opportunity.naicsCode}`,
  });

  // 2. Set-Aside Eligibility (weight: 0.20)
  const setAsideScore = scoreSetAsideMatch(opportunity.setAsideType, profile.setAsideEligibility);
  factors.push({
    name: "Set-Aside Eligibility",
    score: setAsideScore,
    weight: 0.20,
    detail: setAsideScore === 100
      ? `Eligible: ${opportunity.setAsideType}`
      : setAsideScore >= 50
      ? `Partial eligibility for ${opportunity.setAsideType}`
      : `Not eligible: ${opportunity.setAsideType}`,
  });

  // 3. Compliance Readiness (weight: 0.20)
  const complianceScore = Math.min(profile.complianceScore, 100);
  factors.push({
    name: "Compliance Readiness",
    score: complianceScore,
    weight: 0.20,
    detail: complianceScore >= 80
      ? "Strong compliance posture"
      : complianceScore >= 60
      ? "Moderate compliance - some gaps"
      : "Significant compliance gaps",
  });

  // 4. Contract Value Fit (weight: 0.15)
  const valueScore = scoreValueFit(
    opportunity.estimatedValue,
    profile.minContractValue,
    profile.maxContractValue
  );
  factors.push({
    name: "Contract Value",
    score: valueScore,
    weight: 0.15,
    detail: valueScore >= 80
      ? "Within target range"
      : valueScore >= 50
      ? "Slightly outside preferred range"
      : "Significantly outside range",
  });

  // 5. Timeline Feasibility (weight: 0.10)
  const timelineScore = scoreTimeline(opportunity.dueDate);
  factors.push({
    name: "Timeline",
    score: timelineScore,
    weight: 0.10,
    detail: timelineScore >= 80
      ? "Adequate time to prepare"
      : timelineScore >= 50
      ? "Tight timeline"
      : "Very tight or past deadline",
  });

  // 6. PSC Code Match (weight: 0.10)
  const pscScore = profile.pscCodes.includes(opportunity.pscCode) ? 100 : 30;
  factors.push({
    name: "PSC Code",
    score: pscScore,
    weight: 0.10,
    detail: pscScore === 100
      ? `Match: ${opportunity.pscCode}`
      : `No direct PSC match`,
  });

  // Calculate weighted match score
  const matchScore = Math.round(
    factors.reduce((sum, f) => sum + f.score * f.weight, 0)
  );

  // Calculate risk score (inverse of certain factors)
  const riskScore = calculateRiskScore(opportunity, profile, factors);

  return { matchScore, riskScore, factors };
}

/**
 * Score NAICS code match - exact match, same sector, or no match
 */
function scoreNAICSMatch(opportunityNAICS: string, profileNAICS: string[]): number {
  if (!opportunityNAICS || profileNAICS.length === 0) return 30;

  // Exact match
  if (profileNAICS.includes(opportunityNAICS)) return 100;

  // Same 4-digit prefix (same industry group)
  const oppPrefix4 = opportunityNAICS.slice(0, 4);
  if (profileNAICS.some((code) => code.startsWith(oppPrefix4))) return 75;

  // Same 3-digit prefix (same subsector)
  const oppPrefix3 = opportunityNAICS.slice(0, 3);
  if (profileNAICS.some((code) => code.startsWith(oppPrefix3))) return 50;

  // Same 2-digit prefix (same sector)
  const oppPrefix2 = opportunityNAICS.slice(0, 2);
  if (profileNAICS.some((code) => code.startsWith(oppPrefix2))) return 25;

  return 10;
}

/**
 * Score set-aside eligibility
 */
function scoreSetAsideMatch(setAsideType: string, eligibility: string[]): number {
  if (!setAsideType || setAsideType === "Unrestricted" || setAsideType === "None") {
    return 80; // Unrestricted is open to everyone
  }

  // Direct eligibility match
  if (eligibility.includes(setAsideType)) return 100;

  // Check for partial matches
  const normalizedSetAside = setAsideType.toLowerCase();
  const normalizedEligibility = eligibility.map((e) => e.toLowerCase());

  if (normalizedSetAside.includes("small business") &&
      normalizedEligibility.some((e) => e.includes("small business"))) {
    return 100;
  }

  // Total Small Business is the broadest set-aside
  if (normalizedSetAside.includes("total small business") &&
      normalizedEligibility.some((e) => e.includes("small"))) {
    return 90;
  }

  return 20; // Not eligible
}

/**
 * Score contract value fit
 */
function scoreValueFit(
  value: number,
  minValue?: number,
  maxValue?: number
): number {
  if (!minValue && !maxValue) return 70; // No preference set

  const min = minValue || 0;
  const max = maxValue || Infinity;

  if (value >= min && value <= max) return 100;

  // Within 50% of range
  if (value < min) {
    const ratio = value / min;
    return ratio >= 0.5 ? 60 : 30;
  }

  if (value > max) {
    const ratio = max / value;
    return ratio >= 0.5 ? 60 : 30;
  }

  return 50;
}

/**
 * Score timeline feasibility
 */
function scoreTimeline(dueDate: string): number {
  const now = new Date();
  const due = new Date(dueDate);
  const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilDue < 0) return 0;   // Past due
  if (daysUntilDue < 7) return 20;   // Less than a week
  if (daysUntilDue < 14) return 50;  // 1-2 weeks
  if (daysUntilDue < 21) return 70;  // 2-3 weeks
  if (daysUntilDue < 30) return 85;  // 3-4 weeks
  return 100;                         // More than a month
}

/**
 * Calculate risk score based on various factors
 */
function calculateRiskScore(
  opportunity: Opportunity,
  profile: OrganizationProfile,
  factors: MatchFactor[]
): number {
  let risk = 0;

  // Timeline risk
  const daysUntilDue = Math.ceil(
    (new Date(opportunity.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (daysUntilDue < 14) risk += 25;
  else if (daysUntilDue < 21) risk += 15;
  else if (daysUntilDue < 30) risk += 5;

  // Compliance risk
  if (profile.complianceScore < 50) risk += 30;
  else if (profile.complianceScore < 70) risk += 15;
  else if (profile.complianceScore < 80) risk += 5;

  // Set-aside risk (not eligible)
  const setAsideFactor = factors.find((f) => f.name === "Set-Aside Eligibility");
  if (setAsideFactor && setAsideFactor.score < 50) risk += 25;

  // Value risk (too large for small business)
  if (opportunity.estimatedValue > 500000) risk += 10;
  if (opportunity.estimatedValue > 1000000) risk += 10;

  // NAICS mismatch risk
  const naicsFactor = factors.find((f) => f.name === "NAICS Code");
  if (naicsFactor && naicsFactor.score < 50) risk += 15;

  return Math.min(risk, 100);
}

/**
 * Batch score multiple opportunities
 */
export function scoreOpportunities(
  opportunities: Opportunity[],
  profile: OrganizationProfile
): Array<Opportunity & { matchScore: number; riskScore: number }> {
  return opportunities
    .map((opp) => {
      const result = scoreOpportunity(opp, profile);
      return {
        ...opp,
        matchScore: result.matchScore,
        riskScore: result.riskScore,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Build organization profile from database records
 */
export function buildOrganizationProfile(
  org: { naicsCodes: string[]; pscCodes: string[] },
  compliance: ComplianceProfile | null
): OrganizationProfile {
  return {
    naicsCodes: org.naicsCodes,
    pscCodes: org.pscCodes,
    setAsideEligibility: compliance?.setAsideEligibility || ["Total Small Business"],
    complianceScore: compliance?.readinessScore || 0,
    certifications: compliance?.certifications || [],
    maxContractValue: 1000000, // Default for small business
    minContractValue: 10000,
  };
}
