// ============================================================
// SAM.gov API Integration
// Documentation: https://open.gsa.gov/api/get-opportunities-public-api/
// ============================================================

import { Opportunity } from "@/types";

const SAM_API_BASE = "https://api.sam.gov/opportunities/v2";
const SAM_API_KEY = process.env.SAM_GOV_API_KEY || "";

interface SAMSearchParams {
  keyword?: string;
  naicsCode?: string;
  agency?: string;
  setAside?: string;
  postedFrom?: string;
  postedTo?: string;
  responseDeadlineFrom?: string;
  responseDeadlineTo?: string;
  limit?: number;
  offset?: number;
  status?: string;
  ptype?: string; // procurement type
  solicitationNumber?: string;
}

interface SAMOpportunity {
  noticeId: string;
  title: string;
  solicitationNumber: string;
  department: string;
  subTier: string;
  office: string;
  postedDate: string;
  type: string;
  baseType: string;
  archiveType: string;
  archiveDate: string;
  typeOfSetAsideDescription: string;
  typeOfSetAside: string;
  responseDeadLine: string;
  naicsCode: string;
  classificationCode: string; // PSC code
  active: string;
  description: string;
  organizationType: string;
  uiLink: string;
  award?: {
    amount: string;
    date: string;
    number: string;
    awardee: {
      name: string;
      ueiSAM: string;
    };
  };
  pointOfContact?: Array<{
    type: string;
    fullName: string;
    email: string;
    phone: string;
  }>;
  placeOfPerformance?: {
    streetAddress: string;
    city: { code: string; name: string };
    state: { code: string; name: string };
    country: { code: string; name: string };
  };
}

interface SAMSearchResponse {
  totalRecords: number;
  limit: number;
  offset: number;
  opportunitiesData: SAMOpportunity[];
}

/**
 * Search SAM.gov for contract opportunities
 */
export async function searchSAMOpportunities(
  params: SAMSearchParams
): Promise<{ opportunities: Opportunity[]; total: number }> {
  if (!SAM_API_KEY) {
    console.warn("SAM.gov API key not configured. Set SAM_GOV_API_KEY in environment.");
    return { opportunities: [], total: 0 };
  }

  const queryParams = new URLSearchParams();
  queryParams.set("api_key", SAM_API_KEY);
  queryParams.set("limit", String(params.limit || 25));
  queryParams.set("offset", String(params.offset || 0));

  if (params.keyword) queryParams.set("keyword", params.keyword);
  if (params.naicsCode) queryParams.set("naics", params.naicsCode);
  if (params.setAside) queryParams.set("typeOfSetAside", params.setAside);
  if (params.postedFrom) queryParams.set("postedFrom", params.postedFrom);
  if (params.postedTo) queryParams.set("postedTo", params.postedTo);
  if (params.responseDeadlineFrom) queryParams.set("rdlfrom", params.responseDeadlineFrom);
  if (params.responseDeadlineTo) queryParams.set("rdlto", params.responseDeadlineTo);
  if (params.solicitationNumber) queryParams.set("solnum", params.solicitationNumber);

  // Default to active solicitations
  queryParams.set("ptype", params.ptype || "o,k"); // o=solicitation, k=combined synopsis/solicitation
  queryParams.set("status", params.status || "active");

  try {
    const url = `${SAM_API_BASE}/search?${queryParams.toString()}`;
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`SAM.gov API error (${response.status}):`, errorText);
      throw new Error(`SAM.gov API returned ${response.status}`);
    }

    const data: SAMSearchResponse = await response.json();

    const opportunities = data.opportunitiesData.map(transformSAMOpportunity);

    return {
      opportunities,
      total: data.totalRecords,
    };
  } catch (error) {
    console.error("SAM.gov search failed:", error);
    throw error;
  }
}

/**
 * Get a single opportunity by notice ID from SAM.gov
 */
export async function getSAMOpportunityDetail(noticeId: string): Promise<Opportunity | null> {
  if (!SAM_API_KEY) {
    return null;
  }

  try {
    const url = `${SAM_API_BASE}/search?api_key=${SAM_API_KEY}&noticeid=${noticeId}`;
    const response = await fetch(url, {
      headers: { "Accept": "application/json" },
      next: { revalidate: 600 },
    });

    if (!response.ok) {
      return null;
    }

    const data: SAMSearchResponse = await response.json();

    if (data.opportunitiesData.length === 0) {
      return null;
    }

    return transformSAMOpportunity(data.opportunitiesData[0]);
  } catch (error) {
    console.error("SAM.gov detail fetch failed:", error);
    return null;
  }
}

/**
 * Transform SAM.gov API response to our Opportunity type
 */
function transformSAMOpportunity(sam: SAMOpportunity): Opportunity {
  const agency = [sam.department, sam.subTier, sam.office]
    .filter(Boolean)
    .join(" - ");

  // Estimate value from award data or default
  let estimatedValue = 0;
  if (sam.award?.amount) {
    estimatedValue = parseFloat(sam.award.amount) || 0;
  }

  // Map SAM set-aside codes to readable names
  const setAsideMap: Record<string, string> = {
    "SBA": "Total Small Business",
    "SBP": "Partial Small Business",
    "8A": "8(a) Business Development",
    "8AN": "8(a) Sole Source",
    "HZC": "HUBZone",
    "HZS": "HUBZone Sole Source",
    "SDVOSBC": "Service-Disabled Veteran-Owned Small Business",
    "SDVOSBS": "SDVOSB Sole Source",
    "WOSB": "Women-Owned Small Business",
    "WOSBSS": "WOSB Sole Source",
    "EDWOSB": "Economically Disadvantaged WOSB",
    "EDWOSBSS": "EDWOSB Sole Source",
    "VSA": "Veteran-Owned Small Business",
    "VSS": "VOSB Sole Source",
  };

  const setAsideType = setAsideMap[sam.typeOfSetAside] || sam.typeOfSetAsideDescription || "Unrestricted";

  // Determine status
  let status: "active" | "closed" | "awarded" | "cancelled" = "active";
  if (sam.active === "No") status = "closed";
  if (sam.award) status = "awarded";

  // Extract point of contact
  const poc = sam.pointOfContact?.[0];
  const pointOfContact = poc
    ? `${poc.fullName}${poc.email ? `, ${poc.email}` : ""}${poc.phone ? `, ${poc.phone}` : ""}`
    : undefined;

  // Place of performance
  const pop = sam.placeOfPerformance;
  const placeOfPerformance = pop
    ? [pop.city?.name, pop.state?.name, pop.country?.name].filter(Boolean).join(", ")
    : undefined;

  return {
    id: sam.noticeId,
    title: sam.title,
    agency,
    solicitationNumber: sam.solicitationNumber || sam.noticeId,
    naicsCode: sam.naicsCode || "",
    pscCode: sam.classificationCode || "",
    setAsideType,
    dueDate: sam.responseDeadLine || sam.archiveDate,
    estimatedValue,
    source: "SAM.gov",
    status,
    matchScore: 0, // Will be calculated by matching engine
    riskScore: 0,  // Will be calculated by risk engine
    description: sam.description || "",
    requirements: [],
    deliveryRequirements: undefined,
    placeOfPerformance,
    pointOfContact,
    postedDate: sam.postedDate,
    responseDate: sam.responseDeadLine || sam.archiveDate,
    archiveDate: sam.archiveDate,
    productCategory: undefined,
    certifications: setAsideType !== "Unrestricted" ? [setAsideType] : [],
  };
}

/**
 * Get set-aside type codes for SAM.gov API
 */
export function getSAMSetAsideCodes(): Array<{ code: string; label: string }> {
  return [
    { code: "SBA", label: "Total Small Business" },
    { code: "8A", label: "8(a)" },
    { code: "HZC", label: "HUBZone" },
    { code: "SDVOSBC", label: "SDVOSB" },
    { code: "WOSB", label: "WOSB" },
    { code: "EDWOSB", label: "EDWOSB" },
  ];
}
