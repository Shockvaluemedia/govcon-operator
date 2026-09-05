# Dependency Security Evidence - 2026-09-05

Status: local remediation proof complete; exact-change CI pending

Starting repository state: `main` at `477b7220b11cbd5a5e8d76f18b12247326e78bc2`

Branch: `agent/govcon-dependency-remediation`

## Scope

- Remediate the seven high-severity findings reported by the full installed dependency tree.
- Keep Prisma ORM on the verified v6 runtime instead of combining this fix with the breaking v7 driver, client-generation, ESM, CLI, and connection-pool migration.
- Make high-severity dependency auditing an exact-change CI gate.
- Replace mutable, deprecated GitHub Action major tags with current release commit pins.

## Remediation

- Next.js and `eslint-config-next`: `16.2.10` to `16.3.4`.
- Next.js PostCSS: `8.5.16` to `8.5.23`.
- Sharp: `0.34.5` to `0.35.4`.
- Nanoid: `3.3.12` to `3.3.18`.
- Tailwind CSS and its PostCSS integration: `4.3.0` to `4.3.3`.
- Prisma config's `deepmerge-ts`: overridden from `7.1.5` to patched `8.0.1`.
- Brace Expansion: patched `1.1.18` and `5.0.9` lines.
- Browserslist: `4.28.2` to `4.28.9`.
- JS-YAML: `4.3.0` to `4.3.2`.
- GitHub Actions: `actions/checkout` pinned to v7.0.1 commit `3d3c42e5aac5ba805825da76410c181273ba90b1`; `actions/setup-node` pinned to v7.0.0 commit `820762786026740c76f36085b0efc47a31fe5020`.
- Runtime declaration: Node.js 22 or newer; CI remains on Node.js 22.

The `deepmerge-ts` override is intentionally narrow. Prisma 6.19.3's config package consumes the unchanged plain `deepmerge` export. Remove the override when the selected supported Prisma release directly depends on `deepmerge-ts` 8 or newer. A later Prisma major upgrade must separately verify generated-client imports, the PostgreSQL driver adapter, connection-pool behavior, ESM settings, and changed migration-diff flags.

## Local Verification

- Clean `npm ci`: 599 packages installed; 600 audited; zero vulnerabilities.
- `npm audit --audit-level=high`: zero known vulnerabilities across the complete installed tree.
- `npm audit --omit=dev --audit-level=high`: zero known production dependency vulnerabilities.
- Circular-object `deepmerge-ts` regression: completed with preserved circular identity and no stack exhaustion.
- Authorization tests: 8 passed.
- ESLint: passed.
- Prisma Client generation: passed with Prisma 6.19.3 and the patched config dependency.
- Optimized Next.js 16.3.4 build: passed; 42 routes generated or registered.
- Fresh migration deploy and status: passed on isolated PostgreSQL 16.
- Schema drift: none before or after application smoke.
- Seed and backup/restore rehearsal: passed; all 19 table counts and schema/migration-ledger fingerprints matched, all integrity checks returned zero, and temporary artifacts were removed.
- Authenticated strict-data smoke: passed, including anonymous fail-closed behavior, login, tenant-boundary rejection, product reads and writes, AI mock behavior, role boundaries, and cross-organization assignment denial.
- Cleanup: application server stopped, disposable database dropped, and local PostgreSQL service stopped.

## Evidence Boundary

Audit results are point-in-time evidence against the npm advisory database and the exact lockfile. They do not prove future advisory absence or exploit impossibility. This change does not deploy the application, inspect AWS, approve production, or close the remaining infrastructure, recovery, observability, rate-limit, AI-governance, and live-environment blockers.

Exact-change GitHub Actions must reproduce install, full-tree audit, migration/recovery, build, and authenticated smoke before this branch is merge-ready.
