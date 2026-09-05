# GovCon Operator Constitution Adoption Profile

Date: 2026-07-14

Status: `ADOPTED — OPERATIONAL VALIDATION PENDING`

Baseline: [SVM Engineering Constitution v0.2.0](https://github.com/Shockvaluemedia/svm-engineering-constitution/tree/v0.2.0)

This record is project-specific. It does not change the portfolio Constitution and does not authorize a production release.
The status describes the prepared working-tree adoption; it becomes the repository baseline only after approved pull-request merge.

## Ownership and purpose

- Repository owner: Shock Value Media (SVM-owned repository).
- Approval authority: SVM owner, currently the sole approval authority under owner decision OD-017.
- Primary user: a small-business government-contracting operator.
- Core job: discover relevant solicitations, make a defensible bid/no-bid decision, assemble readiness and supplier proof, and move a response toward submission.
- Success signal: an invited pilot user completes a sourced-opportunity-to-reviewed-proposal workflow with traceable evidence and a clear next action.

## Runtime and trust boundaries

1. A browser uses the Next.js application and HTTP-only auth cookies.
2. Server routes verify the session with local demo auth or AWS Cognito and resolve the user and organization from PostgreSQL.
3. Organization-scoped records live in PostgreSQL through Prisma.
4. Documents are intended for S3; SAM.gov and optional AI providers are external data processors.
5. The repository does not currently contain production infrastructure as code or evidence of a deployed AWS environment.

Tenant identity MUST come from the verified session. Client-provided organization IDs MUST NOT control reads or writes.

## Data classification

| Data | Class | Notes |
| --- | --- | --- |
| Public SAM.gov solicitation data | Public | Public source does not make tenant annotations public. |
| Source code, mock data, operating procedures | Internal | Keep private unless intentionally released. |
| Organization profiles, saved searches, workflows, supplier records, quotes, notes, AI messages | Confidential | Tenant-scoped and excluded from logs and unapproved AI processing. |
| Uploaded customer documents and proposal content | Restricted pending review | May contain proprietary, personal, contractual, export-controlled, or CUI-like content. |
| Credentials, tokens, API keys, presigned URLs | Restricted | Never commit, log, or place in prompts or screenshots. |

## Recovery profile

| Surface | Tier | Target | Current evidence |
| --- | --- | --- | --- |
| Production PostgreSQL customer and bid data | A | 8h RTO / 4h RPO, encrypted backups retained at least 30 days, quarterly restore test | Reviewed migration and synthetic logical-restore path exist; production RDS backup, retention, restore, and cutover evidence remain absent. |
| Production S3 customer documents | A | Versioning/recovery and retention aligned to customer obligations | Not implemented or verified. |
| Operator logs and audit evidence | B | 24h RTO / 12h RPO, annual restore test | Schema exists; operational storage and restore evidence are absent. |
| Seeded local/CI demo data | C/D | 72h/24h or disposable | Recreated by reviewed migrations and seed; logical backup/restore is rehearsed in CI. This is not production evidence. |

## Environment rules

- Local demo: `GOVCON_DEMO_AUTH=true`; seeded database; mock AI allowed.
- Optimized-build proof in local/CI: may additionally use `GOVCON_DEMO_AUTH_ALLOW_PRODUCTION_BUILD=true`; this override is forbidden on public deployments.
- Production: `GOVCON_DEMO_AUTH=false`, `GOVCON_STRICT_DATA=true`, real Cognito, RDS, S3, and managed secrets.
- Shared and production databases use `prisma migrate deploy`; `prisma db push` is not an approved deployment path.
- Production AI and live SAM.gov processing require explicit provider ownership, rate/cost controls, failure handling, monitoring, and approved data boundaries.

## External obligations

No project-specific contract, partner, CMMC, FedRAMP, FAR/DFARS, records-retention, or CUI determination was available in the repository on 2026-07-14. Until the SVM owner records that review, uploaded documents default to Restricted handling and the product MUST NOT claim regulatory compliance or accept sensitive production workloads on the strength of this adoption alone.

## Release authority

A production release requires an approved pull request, required checks, explicit AWS account/region/environment targeting, reviewable infrastructure, migration and rollback plans, backup/recovery impact, observability, and live smoke/readback evidence. Local lint, build, or demo smoke is not production proof.

No Constitution exceptions are approved for this project.
