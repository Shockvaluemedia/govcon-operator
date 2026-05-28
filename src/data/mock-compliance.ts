import { ComplianceProfile } from "@/types";

export const mockComplianceProfile: ComplianceProfile = {
  id: "comp-001",
  organizationId: "org-001",
  ueiRegistered: true,
  samRegistered: true,
  cageCode: true,
  naicsCodes: true,
  pscCodes: true,
  businessBankAccount: true,
  insurance: true,
  capabilityStatement: false,
  pastPerformance: false,
  certifications: ["Small Business", "SAM.gov Active"],
  setAsideEligibility: ["Total Small Business"],
  readinessScore: 72,
  lastUpdated: "2026-05-20T00:00:00Z",
};

export interface ComplianceItem {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  category: "registration" | "documentation" | "certification" | "financial";
  priority: "required" | "recommended" | "optional";
  helpUrl?: string;
}

export const complianceChecklist: ComplianceItem[] = [
  {
    id: "uei",
    label: "Unique Entity Identifier (UEI)",
    description: "Register for a UEI number through SAM.gov. Required for all federal contracting.",
    completed: true,
    category: "registration",
    priority: "required",
    helpUrl: "https://sam.gov",
  },
  {
    id: "sam",
    label: "SAM.gov Registration",
    description: "Active registration in the System for Award Management. Must be renewed annually.",
    completed: true,
    category: "registration",
    priority: "required",
    helpUrl: "https://sam.gov",
  },
  {
    id: "cage",
    label: "CAGE Code",
    description: "Commercial and Government Entity code assigned during SAM registration.",
    completed: true,
    category: "registration",
    priority: "required",
  },
  {
    id: "naics",
    label: "NAICS Codes",
    description: "North American Industry Classification System codes that describe your business activities.",
    completed: true,
    category: "registration",
    priority: "required",
  },
  {
    id: "psc",
    label: "PSC Codes",
    description: "Product and Service Codes for the products/services you provide.",
    completed: true,
    category: "registration",
    priority: "required",
  },
  {
    id: "bank",
    label: "Business Bank Account",
    description: "Dedicated business bank account for government contract payments.",
    completed: true,
    category: "financial",
    priority: "required",
  },
  {
    id: "insurance",
    label: "Business Insurance",
    description: "General liability insurance. Some contracts require specific coverage amounts.",
    completed: true,
    category: "financial",
    priority: "required",
  },
  {
    id: "capability",
    label: "Capability Statement",
    description: "A professional document summarizing your company's competencies, past performance, and differentiators.",
    completed: false,
    category: "documentation",
    priority: "required",
  },
  {
    id: "past_performance",
    label: "Past Performance Documentation",
    description: "Records of previous contracts, projects, or relevant business experience.",
    completed: false,
    category: "documentation",
    priority: "recommended",
  },
  {
    id: "certifications",
    label: "Small Business Certifications",
    description: "SBA certifications such as 8(a), HUBZone, WOSB, SDVOSB as applicable.",
    completed: false,
    category: "certification",
    priority: "recommended",
  },
  {
    id: "bonding",
    label: "Bonding Capability",
    description: "Surety bonding for construction or high-value contracts.",
    completed: false,
    category: "financial",
    priority: "optional",
  },
  {
    id: "quality",
    label: "Quality Management System",
    description: "ISO 9001 or equivalent quality management certification.",
    completed: false,
    category: "certification",
    priority: "optional",
  },
];
