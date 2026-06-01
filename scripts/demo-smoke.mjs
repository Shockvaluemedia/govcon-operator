const baseUrl = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000";

async function request(path, options) {
  const response = await fetch(`${baseUrl}${path}`, options);
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

async function checkCollection(path, label, minimum = 1) {
  const payload = await request(path);
  assert(Array.isArray(payload.data), `${path} did not return a data array`);
  assert(payload.data.length >= minimum, `${path} returned ${payload.data.length} ${label}; expected at least ${minimum}`);
  console.log(`ok api ${path}: ${payload.data.length} ${label}`);
  return payload.data;
}

async function main() {
  console.log(`GovCon demo smoke: ${baseUrl}`);

  await checkPage("/", "GovCon Operator");
  await checkPage("/login", "Sign");
  await checkProtectedRoute("/opportunities");
  await checkProtectedRoute("/ai-analyzer");
  await checkProtectedRoute("/compliance");
  await checkProtectedRoute("/workflows");

  const opportunities = await checkCollection("/api/opportunities", "opportunities", 8);
  await checkCollection("/api/suppliers", "suppliers", 5);
  await checkCollection("/api/workflows", "workflows", 5);

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
