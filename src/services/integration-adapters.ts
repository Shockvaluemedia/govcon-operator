// ============================================================
// Data Integration Adapters
// Placeholder adapters for SAM.gov, DLA, FPDS, USAspending
// Structured for easy replacement with real API integrations
// ============================================================

import { Opportunity } from "@/types";
import { mockOpportunities } from "@/data/mock-opportunities";

export interface IntegrationAdapter {
  name: string;
  source: string;
  isConnected: boolean;
  lastSync?: string;
  fetchOpportunities(params: SearchParams): Promise<Opportunity[]>;
  getOpportunityDetail(id: string): Promise<Opportunity | null>;
}

export interface SearchParams {
  keyword?: string;
  naicsCode?: string;
  agency?: string;
  setAside?: string;
  postedFrom?: string;
  postedTo?: string;
  limit?: number;
  offset?: number;
}

// SAM.gov Integration Adapter
class SAMGovAdapter implements IntegrationAdapter {
  name = "SAM.gov";
  source = "SAM.gov" as const;
  isConnected = false;
  lastSync = "2026-05-28T00:00:00Z";

  async fetchOpportunities(params: SearchParams): Promise<Opportunity[]> {
    // In production, this would call the SAM.gov API:
    // https://api.sam.gov/opportunities/v2/search
    console.log("SAM.gov adapter: fetching opportunities", params);

    // Return mock data filtered by source
    return mockOpportunities.filter((opp) => opp.source === "SAM.gov");
  }

  async getOpportunityDetail(id: string): Promise<Opportunity | null> {
    // In production: GET https://api.sam.gov/opportunities/v2/{id}
    return mockOpportunities.find((opp) => opp.id === id) || null;
  }
}

// DLA (Defense Logistics Agency) Adapter
class DLAAdapter implements IntegrationAdapter {
  name = "DLA Internet Bid Board System";
  source = "DLA" as const;
  isConnected = false;
  lastSync = "2026-05-28T00:00:00Z";

  async fetchOpportunities(params: SearchParams): Promise<Opportunity[]> {
    // In production, this would scrape or call DLA DIBBS API
    console.log("DLA adapter: fetching opportunities", params);

    return mockOpportunities.filter((opp) => opp.source === "DLA");
  }

  async getOpportunityDetail(id: string): Promise<Opportunity | null> {
    return mockOpportunities.find((opp) => opp.id === id) || null;
  }
}

// FPDS (Federal Procurement Data System) Adapter
class FPDSAdapter implements IntegrationAdapter {
  name = "FPDS";
  source = "FPDS" as const;
  isConnected = false;
  lastSync?: string;

  async fetchOpportunities(params: SearchParams): Promise<Opportunity[]> {
    // In production: https://www.fpds.gov/ezsearch/
    console.log("FPDS adapter: fetching past awards", params);

    // FPDS primarily provides historical award data
    return [];
  }

  async getOpportunityDetail(id: string): Promise<Opportunity | null> {
    console.log("FPDS adapter: getting detail", id);
    return null;
  }
}

// USAspending Adapter
class USAspendingAdapter implements IntegrationAdapter {
  name = "USAspending";
  source = "USAspending" as const;
  isConnected = false;
  lastSync?: string;

  async fetchOpportunities(params: SearchParams): Promise<Opportunity[]> {
    // In production: https://api.usaspending.gov/
    console.log("USAspending adapter: fetching spending data", params);

    // USAspending provides award/spending data, not active opportunities
    return [];
  }

  async getOpportunityDetail(id: string): Promise<Opportunity | null> {
    console.log("USAspending adapter: getting detail", id);
    return null;
  }
}

// State/Local Procurement Adapter
class StateLocalAdapter implements IntegrationAdapter {
  name = "State & Local Procurement";
  source = "State/Local" as const;
  isConnected = false;
  lastSync?: string;

  async fetchOpportunities(params: SearchParams): Promise<Opportunity[]> {
    // In production, this would aggregate from various state procurement portals
    console.log("State/Local adapter: fetching opportunities", params);

    return mockOpportunities.filter((opp) => opp.source === "State/Local");
  }

  async getOpportunityDetail(id: string): Promise<Opportunity | null> {
    return mockOpportunities.find((opp) => opp.id === id) || null;
  }
}

// Integration Manager
class IntegrationManager {
  private adapters: Map<string, IntegrationAdapter> = new Map();

  constructor() {
    this.adapters.set("sam", new SAMGovAdapter());
    this.adapters.set("dla", new DLAAdapter());
    this.adapters.set("fpds", new FPDSAdapter());
    this.adapters.set("usaspending", new USAspendingAdapter());
    this.adapters.set("statelocal", new StateLocalAdapter());
  }

  getAdapter(source: string): IntegrationAdapter | undefined {
    return this.adapters.get(source);
  }

  getAllAdapters(): IntegrationAdapter[] {
    return Array.from(this.adapters.values());
  }

  async fetchAllOpportunities(params: SearchParams): Promise<Opportunity[]> {
    const results = await Promise.all(
      Array.from(this.adapters.values()).map((adapter) =>
        adapter.fetchOpportunities(params).catch(() => [])
      )
    );
    return results.flat();
  }

  getIntegrationStatus(): Array<{
    name: string;
    source: string;
    connected: boolean;
    lastSync?: string;
  }> {
    return Array.from(this.adapters.values()).map((adapter) => ({
      name: adapter.name,
      source: adapter.source,
      connected: adapter.isConnected,
      lastSync: adapter.lastSync,
    }));
  }
}

export const integrationManager = new IntegrationManager();
export default IntegrationManager;
