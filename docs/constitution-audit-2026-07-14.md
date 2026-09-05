# GovCon Operator Constitution Audit

Audit date: 2026-07-14

Repository state reviewed: `main` at `f7d75f7`, plus the uncommitted GovCon product-readiness work present in the working tree.

Constitution baseline: v0.2.0

## Verdict

- Seeded local demo: `GO` for an owner-controlled walkthrough using the documented strict database proof configuration.
- Controlled external pilot: `NO-GO` until data/AI boundaries, migration/recovery, and operating controls are closed or explicitly excepted.
- Production release: `NO-GO`.
- Constitution status: `ADOPTED — OPERATIONAL VALIDATION PENDING`. A merged instruction file proves initial adoption, not recurring conformance.

No exceptions are approved. This audit does not authorize merge, deployment, or a compliance claim.

## Evidence reviewed

- Application routes, dashboard/operator surfaces, auth/session code, Prisma schema and seed, tenant filters, AI and SAM.gov adapters, S3 path, environment contract, CI workflow, and current diff.
- Local PostgreSQL schema push and seeded tenant data.
- Optimized Next.js build and authenticated database-mode smoke.
- Anonymous HTTP probes against the optimized local server.
- Desktop and 390px browser snapshots of login, dashboard, and workflow board.
- npm production dependency audit.
- GitHub Actions history for the last merged `main` run.

## Six-lane review

| Lane | Evidence | Verdict |
| --- | --- | --- |
| Owner and product | A coherent operator loop exists from opportunity discovery through analysis, suppliers, workflow proof, and saved proposal drafts. No real pilot usage, retention, willingness-to-pay, or revenue evidence is recorded. | Demo value plausible; market proof absent. |
| AWS architecture | Cognito, RDS, S3, SAM.gov, and AI seams exist in code. There is no production IaC, account/region/environment target, deployment workflow, health endpoint, alarms, budgets, or vendor-exit record. | Production blocker. |
| Security, privacy, tenancy | Tenant filters exist on major organization-owned records. Anonymous probes reproduced access to protected data/AI routes; the bounded remediation closes this and retires legacy mock-cookie login. A centralized product-action role matrix now protects shared mutations and admin reads, with deterministic role resolution and cross-organization workflow-assignee denial. Rate limits remain absent. | Immediate auth and role blockers remediated; production remains no-go. |
| UI and accessibility | Primary routes are understandable, responsive, and keyboard-addressable at a basic level. The palette/radius still conflict with `DESIGN.md`; sortable cards expose nested button semantics; mobile search text clips; loading/error/permission recovery is inconsistent. | Near-term remediation. No WCAG conformance claim. |
| Engineering and operations | Lint, policy tests, build, reviewed Prisma migration, drift detection, seeded DB setup, synthetic logical-restore rehearsal, audit-log writes, and authenticated smoke exist. Structured production telemetry, alert ownership, the broader incident/runbook set, and production restore evidence remain absent. Exact-change CI remains a merge gate for every follow-up. | Demo-ready engineering; production blocker. |
| Market impact | The strongest wedge is a recurring saved-search-to-bid-command loop. The app has shipped capability but no observed customer action or commercial proof. | Run a measured pilot before feature expansion. |

## Immediate safety and release blockers

1. Server authorization: all protected APIs must fail closed before mock fallback, database access, SAM.gov calls, or AI execution. Regression proof must cover anonymous GET and POST paths.
2. Role authorization: remediated by the server-side action matrix in `docs/api-authorization-policy.md`, enforced before protected product mutations and admin reads, with pure role tests and authenticated positive/negative smoke coverage.
3. Production data path: the repository now has reviewed migration history, a `migrate deploy`/drift gate, and synthetic logical-restore proof. A production database target, backup-policy implementation, production restore/cutover evidence, and measured Tier A RTO/RPO remain absent.
4. AWS operations: no infrastructure as code, deploy target, health check, structured logs/metrics, alarms, rollback runbook, cost budget, or live environment readback exists.
5. AI governance: live providers can receive opportunity and organization context, but allowed inputs, provider terms, retention, evaluations, monitoring, cost bounds, and human escalation are not approved or tested.
6. Sensitive documents and obligations: uploaded files may contain Restricted material. External obligations are unresolved; no FedRAMP, CMMC, FAR/DFARS, CUI, or legal compliance claim is supported.
7. Public-demo safety: demo tokens are intentionally lightweight. The optimized-build override is test-only and must never be enabled on an internet-facing deployment.

## Near-term reliability work

- Keep the API authorization policy matrix and role-boundary regression coverage current as protected actions are added.
- Keep migration deploy, drift detection, rollback planning, and synthetic restore rehearsal mandatory; add production RDS backup/restore and cutover evidence before release.
- Define production AWS architecture in IaC with environment isolation, managed secrets, encrypted RDS/S3, retention, alarms, budgets, and least-privilege IAM.
- Add rate limiting and abuse controls to login, registration, AI, and SAM.gov routes.
- Add a health/readiness endpoint that distinguishes application health, database reachability, and optional dependency state without exposing secrets.
- Remove broad mock fallbacks from production by validating `GOVCON_STRICT_DATA=true` at startup or deployment.
- Fix sortable-card semantics, focus behavior, mobile toolbar clipping, and the `DESIGN.md` token mismatch; verify keyboard-only and desktop/mobile screenshots.
- Add runbooks for deploy, rollback, incident containment, Cognito recovery, database restore, S3 recovery, and provider outage.

## Backlog improvements

- DOCX/PDF proposal export with source citations and approval state.
- Scheduled saved-search sync and notifications after rate, cost, consent, and delivery controls exist.
- Product analytics that distinguish viewed, saved, analyzed, advanced, submitted, and awarded outcomes.
- Data retention/deletion controls and customer export for portability.

## Bounded remediation in this audit

Scope:

- Require verified sessions on protected product APIs before returning database or mock data or invoking SAM.gov/AI providers.
- Retire the legacy `/api/auth` mock-cookie login behavior.
- Validate Cognito access-token `token_use` and client identity.
- Resolve roles from the authenticated user's current organization.
- Reject unknown compliance-profile fields rather than spreading request data into Prisma.
- Add anonymous API boundary checks to the authenticated demo smoke.
- Enforce a centralized owner/admin/operator/coach/viewer action matrix before protected product mutations and admin reads.
- Resolve multiple role rows deterministically and default missing or unknown roles to viewer.
- Reject workflow assignees from outside the authenticated user's organization.

Success criteria:

- Anonymous protected API probes return `401`.
- Legacy `POST /api/auth` returns `410` and sets no cookie.
- Authenticated database-mode dashboard, opportunity, supplier, workflow, analysis, and proposal flows still pass.
- Lint, optimized build, dependency audit, and diff checks pass.

## Verification outcome

- `npm run lint`: passed.
- `npm test`: eight authorization-policy and tenant-boundary tests passed.
- `npm run build`: passed with Next.js route generation and TypeScript checks.
- `npm audit --omit=dev --audit-level=high`: zero known production dependency vulnerabilities reported.
- Strict database demo smoke: passed against the optimized build on `127.0.0.1:3020`.
- Authorization matrix: every protected product API method tested returned `401` without a session.
- Authenticated role matrix: viewer writes/admin reads were denied; coach AI was allowed while supplier writes were denied; operator supplier writes passed authorization while admin reads were denied; admin reads were allowed.
- Cross-organization workflow assignment returned `403` before mutation.
- Legacy auth: `POST /api/auth` returned `410` and did not set a cookie.
- Tenant input boundary: a compliance update containing a client-supplied `organizationId` returned `400`.
- Authenticated workflow: dashboard, saved-search sync, opportunity detail, suppliers, workflows, AI analysis, persisted proposal draft, and workflow proof checks passed.
- `git diff --check`: passed.

One initial strict-data smoke attempt returned Prisma `P1001` for local PostgreSQL while the container later reported healthy; an immediate rerun passed. This is treated as evidence for the unresolved health/readiness and database-operations work, not hidden as a green production signal.

PR #3 merged the initial adoption and remediation as `c0c1516ffaed6e6caf44b3166fc7fd0d6508c8cb`; post-merge Demo Smoke run `29356145624` passed on `main`. This follow-up role-policy change remains subject to its own pull request and exact-change CI before merge. No production deployment or live AWS verification occurred.

## Market experiment

Invite one real small-business contractor to use the saved-search-to-workflow loop for seven days. Success means the user saves or syncs at least one relevant opportunity, records one bid/no-bid decision, advances one workflow with supplier/compliance proof, generates and reviews one proposal draft, and returns for a second session without operator rescue. Record action timestamps, failure points, outcome quality, and willingness to pay. Anything less remains product hypothesis, not market validation.

## Operational-validation exit criteria

1. Complete: the initial adoption and remediation merged through PR #3 with required checks and a green post-merge run.
2. Run a bounded pilot using non-sensitive or explicitly approved data.
3. Capture role-boundary, migration, recovery, observability, and AI-provider evidence.
4. Record the exact commit, workflow runs, environment target, smoke result, unresolved risks, and any approved exceptions.
5. Only then consider changing the adoption status to `OPERATIONALLY VALIDATED`; production still requires its own release-readiness decision.

## Follow-up Evidence - 2026-09-05

The migration/recovery follow-up adds initial Prisma migration `20260905000000_initial`, removes the repository's `db push` deployment command, and makes CI deploy migrations, verify status and drift, seed synthetic data, and perform an isolated PostgreSQL logical backup/restore rehearsal. Local clean-database migration, zero-drift, exact fingerprint, relational canary, and cleanup checks passed. See `docs/migration-recovery-evidence-2026-09-05.md` and `docs/database-migration-recovery.md`.

This closes the repository-mechanics portion of blocker 3. It does not change the controlled-pilot or production verdict because no production RDS target, retention/encryption readback, production restore, application cutover, or Tier A RTO/RPO evidence exists.

The same verification pass found seven high-severity advisories in the existing production dependency graph via `npm audit --omit=dev --audit-level=high`. No dependency was added by the migration/recovery change. Next.js and Prisma-transitive remediation requires a separately tested dependency update and remains an unresolved release gate.
