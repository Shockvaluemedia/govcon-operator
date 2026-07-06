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

async function login() {
  await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: demoEmail, password: demoPassword }),
  });

  assert(cookies.has("access_token"), "Login did not set an access_token cookie");
  console.log(`ok auth login ${demoEmail}`);
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

async function main() {
  console.log(`GovCon demo smoke: ${baseUrl}`);

  await checkPage("/", "GovCon Operator");
  await checkPage("/login", "Sign");
  await checkProtectedRoute("/opportunities");
  await checkProtectedRoute("/ai-analyzer");
  await checkProtectedRoute("/compliance");
  await checkProtectedRoute("/workflows");

  await login();
  await checkPage("/dashboard", "Dashboard");
  await checkPage("/opportunities", "Opportunity Discovery");
  await checkPage("/suppliers", "Supplier Sourcing");

  await checkDashboardMetrics();
  const opportunities = await checkCollection("/api/opportunities", "opportunities", 8, "database");
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

  console.log("GovCon demo smoke passed");
}

main().catch((error) => {
  console.error("GovCon demo smoke failed");
  console.error(error);
  process.exit(1);
});
