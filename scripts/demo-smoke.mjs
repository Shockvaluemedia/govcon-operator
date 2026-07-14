const baseUrl = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000";
const demoEmail = process.env.SMOKE_DEMO_EMAIL ?? "demo@govcon-operator.com";
const demoPassword = process.env.SMOKE_DEMO_PASSWORD ?? "demo-password";
const cookies = new Map();

function storeCookies(response) {
  const setCookies =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie")].filter(Boolean);

  for (const setCookie of setCookies) {
    const [pair] = setCookie.split(";");
    const separatorIndex = pair.indexOf("=");
    if (separatorIndex === -1) continue;
    cookies.set(pair.slice(0, separatorIndex), pair.slice(separatorIndex + 1));
  }
}

function cookieHeader() {
  return Array.from(cookies.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

async function request(path, options) {
  const headers = new Headers(options?.headers ?? {});
  const cookie = cookieHeader();
  if (cookie) {
    headers.set("Cookie", cookie);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  });
  storeCookies(response);

  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}: ${JSON.stringify(body).slice(0, 300)}`);
  }

  return body;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function checkPage(path, expectedText) {
  const html = await request(path);
  assert(typeof html === "string" && html.includes(expectedText), `${path} did not include ${expectedText}`);
  console.log(`ok page ${path}`);
}

async function checkProtectedRoute(path) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
  const location = response.headers.get("location") ?? "";
  assert(response.status === 307 || response.status === 308, `${path} did not redirect when unauthenticated`);
  assert(location.startsWith("/login"), `${path} redirected to ${location}, expected /login`);
  console.log(`ok auth gate ${path} -> ${location}`);
}

async function checkProtectedApi(method, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });

  assert(response.status === 401, `${method} ${path} returned ${response.status}; expected 401`);
  console.log(`ok api auth gate ${method} ${path}`);
}

async function checkLegacyAuthRetired() {
  const response = await fetch(`${baseUrl}/api/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: demoEmail, password: demoPassword }),
  });

  assert(response.status === 410, `POST /api/auth returned ${response.status}; expected 410`);
  assert(!response.headers.get("set-cookie"), "Legacy auth endpoint set a cookie");
  console.log("ok legacy auth endpoint retired");
}

async function login() {
  await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: demoEmail, password: demoPassword }),
  });

  assert(cookies.has("access_token"), "Login did not set an access_token cookie");
  console.log(`ok auth login ${demoEmail}`);
}

async function checkComplianceInputBoundary() {
  const response = await fetch(`${baseUrl}/api/compliance`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader(),
    },
    body: JSON.stringify({
      ueiRegistered: true,
      samRegistered: true,
      cageCode: true,
      naicsCodes: true,
      pscCodes: true,
      businessBankAccount: true,
      insurance: true,
      capabilityStatement: true,
      pastPerformance: true,
      certifications: [],
      setAsideEligibility: [],
      organizationId: "org-outside-session",
    }),
  });

  assert(response.status === 400, `PUT /api/compliance accepted an unknown tenant field (${response.status})`);
  console.log("ok compliance input boundary rejects tenant override");
}

async function checkCollection(path, label, minimum = 1, expectedSource) {
  const payload = await request(path, {
    headers: expectedSource ? { "x-govcon-data-mode": expectedSource } : undefined,
  });
  assert(Array.isArray(payload.data), `${path} did not return a data array`);
  assert(payload.data.length >= minimum, `${path} returned ${payload.data.length} ${label}; expected at least ${minimum}`);
  if (expectedSource) {
    assert(payload.meta?.source === expectedSource, `${path} returned ${payload.meta?.source || "unknown"} data; expected ${expectedSource}`);
  }
  console.log(`ok api ${path}: ${payload.data.length} ${label}`);
  return payload.data;
}

async function checkDashboardMetrics() {
  const payload = await request("/api/dashboard", {
    headers: { "x-govcon-data-mode": "database" },
  });

  assert(payload.meta?.source === "database", "/api/dashboard did not return database metrics");
  assert(payload.data?.activeBids >= 1, "/api/dashboard did not include active bids");
  assert(payload.data?.complianceScore >= 1, "/api/dashboard did not include compliance score");
  console.log(`ok api /api/dashboard: ${payload.data.activeBids} active bids`);
}

async function checkOpportunityDetail(opportunityId) {
  const payload = await request(`/api/opportunities/${encodeURIComponent(opportunityId)}`, {
    headers: { "x-govcon-data-mode": "database" },
  });

  assert(payload.data?.id === opportunityId, "Opportunity detail did not return the requested opportunity");
  assert(payload.meta?.source === "database", "Opportunity detail did not use database source");
  console.log(`ok api /api/opportunities/${opportunityId}: detail`);
}

async function checkSavedSearchSync() {
  const searchName = `Demo smoke SAM scan ${Date.now()}`;
  const created = await request("/api/opportunities/searches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: searchName,
      keyword: "office supplies",
      naicsCode: "424120",
      setAside: "Total Small Business",
      limit: 10,
    }),
  });

  assert(created.data?.id, "Saved search create did not return an id");

  const searches = await request("/api/opportunities/searches");
  assert(
    Array.isArray(searches.data) && searches.data.some((search) => search.id === created.data.id),
    "Saved search list did not include created search"
  );

  const sync = await request("/api/opportunities/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ searchId: created.data.id }),
  });

  assert(typeof sync.synced === "number", "SAM sync did not return a synced count");
  assert(sync.meta?.source === "SAM.gov", "SAM sync did not report SAM.gov source");

  await request(`/api/opportunities/searches?id=${encodeURIComponent(created.data.id)}`, {
    method: "DELETE",
  });

  console.log(`ok api saved searches + SAM sync: ${sync.synced} synced`);
}

async function checkProposalDraft(opportunityId) {
  const payload = await request("/api/ai/proposal-draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ opportunityId }),
  });

  assert(payload.data?.executiveSummary, "Proposal draft did not include an executive summary");
  assert(Array.isArray(payload.data?.complianceMatrix), "Proposal draft did not include a compliance matrix");
  assert(payload.data?.provider, "Proposal draft did not include provider metadata");

  const notes = await request(`/api/notes?opportunityId=${encodeURIComponent(opportunityId)}&type=proposal_draft`);
  assert(Array.isArray(notes.data), "Proposal draft notes did not return an array");
  assert(notes.data.length >= 1, "Proposal draft was not visible in saved notes");
  console.log(`ok api /api/ai/proposal-draft: ${payload.data.provider}`);
}

async function checkWorkflowCommandCenter(opportunityId) {
  const payload = await request("/api/workflows", {
    headers: { "x-govcon-data-mode": "database" },
  });

  assert(Array.isArray(payload.data), "Workflow command center did not return workflows");
  const workflow = payload.data.find((item) => item.opportunity?.id === opportunityId);
  assert(workflow, "Workflow command center did not include the tested opportunity");
  assert(Array.isArray(workflow.opportunity.analyses), "Workflow payload did not include analyses");
  assert(workflow.opportunity.analyses.length >= 1, "Workflow payload did not include latest analysis proof");
  assert(Array.isArray(workflow.opportunity.supplierQuotes), "Workflow payload did not include supplier quote status");
  assert(Array.isArray(workflow.opportunity.notes), "Workflow payload did not include proposal draft notes");
  assert(workflow.opportunity.notes.length >= 1, "Workflow payload did not include saved proposal draft proof");
  console.log(`ok api /api/workflows: command center proof for ${opportunityId}`);
}

async function main() {
  console.log(`GovCon demo smoke: ${baseUrl}`);

  await checkPage("/", "GovCon Operator");
  await checkPage("/login", "Sign");
  await checkProtectedRoute("/opportunities");
  await checkProtectedRoute("/ai-analyzer");
  await checkProtectedRoute("/compliance");
  await checkProtectedRoute("/workflows");
  await checkProtectedApi("GET", "/api/auth");
  await checkProtectedApi("GET", "/api/dashboard");
  await checkProtectedApi("GET", "/api/compliance");
  await checkProtectedApi("GET", "/api/suppliers");
  await checkProtectedApi("GET", "/api/workflows");
  await checkProtectedApi("GET", "/api/documents");
  await checkProtectedApi("GET", "/api/opportunities");
  await checkProtectedApi("GET", "/api/opportunities/opp-001");
  await checkProtectedApi("GET", "/api/opportunities/saved");
  await checkProtectedApi("GET", "/api/opportunities/searches");
  await checkProtectedApi("GET", "/api/opportunities/search?keyword=office");
  await checkProtectedApi("GET", "/api/notes");
  await checkProtectedApi("GET", "/api/documents/download?id=doc-001");
  await checkProtectedApi("GET", "/api/admin");
  await checkProtectedApi("POST", "/api/ai/chat", { message: "hello" });
  await checkProtectedApi("POST", "/api/ai/analyze", { opportunityId: "opp-001" });
  await checkProtectedApi("POST", "/api/ai/proposal-draft", { opportunityId: "opp-001" });
  await checkProtectedApi("POST", "/api/opportunities", {});
  await checkProtectedApi("POST", "/api/opportunities/saved", { opportunityId: "opp-001" });
  await checkProtectedApi("DELETE", "/api/opportunities/saved?opportunityId=opp-001");
  await checkProtectedApi("POST", "/api/opportunities/searches", { name: "unauthorized" });
  await checkProtectedApi("DELETE", "/api/opportunities/searches?id=search-001");
  await checkProtectedApi("POST", "/api/opportunities/sync", {});
  await checkProtectedApi("POST", "/api/suppliers", {});
  await checkProtectedApi("POST", "/api/workflows", {});
  await checkProtectedApi("PATCH", "/api/workflows", {});
  await checkProtectedApi("PUT", "/api/compliance", {});
  await checkProtectedApi("POST", "/api/documents", {});
  await checkProtectedApi("DELETE", "/api/documents?id=doc-001");
  await checkLegacyAuthRetired();

  await login();
  await checkComplianceInputBoundary();
  await checkPage("/dashboard", "Dashboard");
  await checkPage("/opportunities", "Opportunity Discovery");
  await checkPage("/suppliers", "Supplier Sourcing");

  await checkDashboardMetrics();
  await checkSavedSearchSync();
  const opportunities = await checkCollection("/api/opportunities", "opportunities", 8, "database");
  await checkOpportunityDetail(opportunities[0].id);
  await checkCollection("/api/suppliers", "suppliers", 5, "database");
  await checkCollection("/api/workflows", "workflows", 5, "database");

  const analysis = await request("/api/ai/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ opportunityId: opportunities[0].id }),
  });

  assert(analysis.data?.bidRecommendation, "AI analysis did not include a bid recommendation");
  assert(Array.isArray(analysis.data?.recommendedNextSteps), "AI analysis did not include next steps");
  console.log(`ok api /api/ai/analyze: ${analysis.data.bidRecommendation}`);

  await checkProposalDraft(opportunities[0].id);
  await checkWorkflowCommandCenter(opportunities[0].id);

  console.log("GovCon demo smoke passed");
}

main().catch((error) => {
  console.error("GovCon demo smoke failed");
  console.error(error);
  process.exit(1);
});
