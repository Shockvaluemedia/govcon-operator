<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Design Compliance

Before making UI changes, read `DESIGN.md` and follow this app's documented archetype, token direction, forbidden patterns, prompt recipe, and QA checklist.

For UI work:

- Keep component behavior consistent with the repo's existing patterns.
- Use the app's documented visual direction instead of generic SaaS defaults.
- Prefer existing design tokens or create semantic tokens rather than hardcoding one-off styles.
- Include screenshots or a clear visual verification note when opening UI pull requests.
- Do not introduce patterns listed under `Avoid` in `DESIGN.md`.

## SVM Engineering Constitution

This SVM-owned repository adopts the
[SVM Engineering Constitution v0.2.0](https://github.com/Shockvaluemedia/svm-engineering-constitution/blob/v0.2.0/constitution/CONSTITUTION.md).
The project profile is in `docs/constitution-adoption.md`; the current evidence record is in
`docs/constitution-audit-2026-07-14.md`. Adoption is operational-validation pending until the
change is reviewed, merged, exercised in a bounded pilot, and supported by current evidence.

Project-specific rules:

- The core user is a small-business government-contracting operator deciding what to pursue and what to do next.
- SAM.gov solicitation records are Public. Tenant profiles, supplier records, workflows, proposal drafts, AI messages, and uploaded documents are at least Confidential. Secrets are Restricted.
- Protected UI routes and their backing APIs MUST require a verified server-side session. Tenant identity MUST come from that session, never request data.
- Production MUST set `GOVCON_DEMO_AUTH=false` and `GOVCON_STRICT_DATA=true`. The production-build demo override is limited to local or CI proof and MUST NOT be enabled on a public deployment.
- Live AI providers MUST NOT receive Confidential or Restricted tenant data until the provider, allowed inputs, retention, evaluation, monitoring, and human-review rules are approved and documented.
- A production release claim requires an approved pull request, required checks, an explicit AWS account/region/environment target, migration and rollback evidence, observability, and live smoke/readback proof.
- Do not claim FedRAMP, CMMC, FAR/DFARS, or other regulatory compliance from this repository or Constitution adoption alone.
