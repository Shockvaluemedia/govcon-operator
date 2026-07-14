import type { Opportunity as PrismaOpportunity } from "@prisma/client";
import type { Opportunity } from "@/types";

const opportunitySources = [
  "SAM.gov",
  "DLA",
  "FPDS",
  "USAspending",
  "State/Local",
] as const;

const opportunityStatuses = ["active", "closed", "awarded", "cancelled"] as const;

function normalizeSource(source: string): Opportunity["source"] {
  return opportunitySources.includes(source as Opportunity["source"])
    ? (source as Opportunity["source"])
    : "SAM.gov";
}

function normalizeStatus(status: string): Opportunity["status"] {
  return opportunityStatuses.includes(status as Opportunity["status"])
    ? (status as Opportunity["status"])
    : "active";
}

export function serializeOpportunity(dbOpp: PrismaOpportunity): Opportunity {
  return {
    id: dbOpp.id,
    title: dbOpp.title,
    agency: dbOpp.agency,
    solicitationNumber: dbOpp.solicitationNumber,
    naicsCode: dbOpp.naicsCode,
    pscCode: dbOpp.pscCode,
    setAsideType: dbOpp.setAsideType,
    dueDate: dbOpp.dueDate.toISOString(),
    estimatedValue: Number(dbOpp.estimatedValue),
    source: normalizeSource(dbOpp.source),
    status: normalizeStatus(dbOpp.status),
    matchScore: dbOpp.matchScore || 50,
    riskScore: dbOpp.riskScore || 50,
    description: dbOpp.description || "",
    requirements: dbOpp.requirements,
    deliveryRequirements: dbOpp.deliveryRequirements || undefined,
    placeOfPerformance: dbOpp.placeOfPerformance || undefined,
    pointOfContact: dbOpp.pointOfContact || undefined,
    postedDate: dbOpp.postedDate.toISOString(),
    responseDate: dbOpp.responseDate.toISOString(),
    archiveDate: dbOpp.archiveDate?.toISOString(),
    productCategory: dbOpp.productCategory || undefined,
    certifications: dbOpp.certifications,
  };
}
