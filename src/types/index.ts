// ============================================================
// GovCon Operator - Core Type Definitions
// ============================================================

export type UserRole = "owner" | "admin" | "operator" | "coach" | "viewer";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  organizationId: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  uei?: string;
  cageCode?: string;
  samRegistered: boolean;
  naicsCodes: string[];
  pscCodes: string[];
  createdAt: string;
}

export interface Opportunity {
  id: string;
  title: string;
  agency: string;
  solicitationNumber: string;
  naicsCode: string;
  pscCode: string;
  setAsideType: string;
  dueDate: string;
  estimatedValue: number;
  source: "SAM.gov" | "DLA" | "FPDS" | "USAspending" | "State/Local";
  status: "active" | "closed" | "awarded" | "cancelled";
  matchScore: number;
  riskScore: number;
  description: string;
  requirements: string[];
  deliveryRequirements?: string;
  placeOfPerformance?: string;
  pointOfContact?: string;
  postedDate: string;
  responseDate: string;
  archiveDate?: string;
  productCategory?: string;
  certifications?: string[];
}

export interface SavedOpportunity {
  id: string;
  opportunityId: string;
  userId: string;
  organizationId: string;
  notes?: string;
  savedAt: string;
  opportunity: Opportunity;
}

export interface OpportunityAnalysis {
  id: string;
  opportunityId: string;
  userId: string;
  summary: string;
  bidRecommendation: "bid" | "no-bid" | "conditional";
  confidenceScore: number;
  difficultyScore: number;
  complianceRequirements: string[];
  capitalConcerns: string[];
  supplierNeeds: string[];
  fulfillmentRisks: string[];
  timelineRisks: string[];
  marginConsiderations: string[];
  questionsToAsk: string[];
  recommendedNextSteps: string[];
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  website?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  productCategory: string;
  leadTime: string;
  unitCost: number;
  moq: number;
  shippingEstimate: number;
  reliabilityRating: number;
  notes?: string;
  organizationId: string;
  createdAt: string;
}

export interface SupplierQuote {
  id: string;
  supplierId: string;
  opportunityId?: string;
  productDescription: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  leadTime: string;
  validUntil: string;
  status: "pending" | "received" | "accepted" | "rejected";
  notes?: string;
  createdAt: string;
}

export interface ComplianceProfile {
  id: string;
  organizationId: string;
  ueiRegistered: boolean;
  samRegistered: boolean;
  cageCode: boolean;
  naicsCodes: boolean;
  pscCodes: boolean;
  businessBankAccount: boolean;
  insurance: boolean;
  capabilityStatement: boolean;
  pastPerformance: boolean;
  certifications: string[];
  setAsideEligibility: string[];
  readinessScore: number;
  lastUpdated: string;
}

export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  url: string;
  size: number;
  uploadedBy: string;
  organizationId: string;
  opportunityId?: string;
  createdAt: string;
}

export type DocumentType =
  | "capability_statement"
  | "business_license"
  | "insurance"
  | "certification"
  | "quote"
  | "bid_document"
  | "past_performance"
  | "agency_document"
  | "other";

export type WorkflowStage =
  | "discovered"
  | "under_review"
  | "supplier_sourcing"
  | "pricing"
  | "compliance_check"
  | "proposal_prep"
  | "submitted"
  | "awarded"
  | "lost"
  | "fulfillment"
  | "completed";

export interface BidWorkflow {
  id: string;
  opportunityId: string;
  organizationId: string;
  stage: WorkflowStage;
  assignedTo?: string;
  priority: "low" | "medium" | "high" | "critical";
  dueDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  opportunity: Opportunity;
  tasks?: WorkflowTask[];
}

export interface WorkflowTask {
  id: string;
  workflowId: string;
  title: string;
  description?: string;
  status: "pending" | "in_progress" | "completed" | "blocked";
  assignedTo?: string;
  dueDate?: string;
  createdAt: string;
}

export interface Note {
  id: string;
  entityType: "opportunity" | "supplier" | "workflow";
  entityId: string;
  content: string;
  userId: string;
  createdAt: string;
}

export interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  userId: string;
  sessionId: string;
  createdAt: string;
}

export interface MarginCalculation {
  contractPrice: number;
  unitCost: number;
  quantity: number;
  shipping: number;
  packaging: number;
  labor: number;
  financingCost: number;
  platformFees: number;
  contingency: number;
  expectedPaymentDelay: number;
  grossMargin: number;
  netMargin: number;
  cashNeededUpfront: number;
  breakEvenPrice: number;
  riskAdjustedProfit: number;
  bidRecommendation: "strong_bid" | "moderate_bid" | "weak_bid" | "no_bid";
}

export interface DashboardMetrics {
  totalSavedOpportunities: number;
  activeBids: number;
  complianceScore: number;
  estimatedRevenue: number;
  highRiskOpportunities: number;
  tasksDue: number;
  pendingQuotes: number;
  recommendedActions: string[];
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
  createdAt: string;
}
