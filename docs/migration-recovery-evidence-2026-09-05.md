# Migration and Recovery Evidence - 2026-09-05

Status: local synthetic proof and code-bearing exact-change CI complete

Starting repository state: `main` at `f3bc75e8f6c4351610f562b9fc62a908ed1d567a`

Branch: `agent/govcon-migrations-recovery`

Pull request: [#5](https://github.com/Shockvaluemedia/govcon-operator/pull/5)

## Scope

- Generate the initial immutable Prisma migration from the current PostgreSQL datamodel.
- Replace CI `prisma db push` usage with `prisma migrate deploy`, migration status, and live drift checks.
- Exercise a native PostgreSQL custom-format backup and isolated restore.
- Preserve the production `NO-GO` boundary until RDS, retention, encryption, recovery, and live environment evidence exist.

## Migration Review

- Migration: `20260905000000_initial`
- Contents: schema creation, `Role` enum, 19 application tables, indexes, unique constraints, and foreign keys.
- Destructive operations: none.
- PostgreSQL extensions: none required.
- Clean target result: one migration applied successfully.
- Migration status: database schema up to date.
- Live schema drift: no difference detected against `prisma/schema.prisma`.

## Restore Rehearsal

- Source: isolated PostgreSQL 16 database containing only synthetic seeded demo data.
- Tool path: PostgreSQL 16 tools in the repository Docker Compose service. Auto mode selected this path because the host `pg_dump` 14 client was older than the PostgreSQL 16 server.
- Started: `2026-09-05T22:50:01.818Z`.
- Backup complete: `2026-09-05T22:50:03.247Z`.
- Restore complete: `2026-09-05T22:50:03.955Z`.
- Verification complete: `2026-09-05T22:50:04.473Z`.
- Rehearsal elapsed: 2,655 ms.
- Temporary backup size: 50,639 bytes.
- Applied migrations restored: 1.
- Migration-ledger fingerprint: `d4af7cf438d1592dbc70c484e34b9a3b` on source and restore.
- Schema fingerprint: `bce6ddf7e067ebe1d6b8af22e5da1065` on source and restore.
- Integrity result: 0 failed migrations, orphan users, orphan roles, orphan workflows, cross-organization role assignments, or cross-organization workflow-task assignees.
- Data fingerprint: all 19 application tables matched exactly; populated rows included 2 organizations, 6 users, 6 role rows, 8 opportunities, 5 suppliers, 3 quotes, 5 workflows, and 4 workflow tasks.
- Functional check: organization, user, and owner-role relational writes succeeded inside a rolled-back transaction on the restored database.
- Cleanup: temporary restore database dropped and temporary dump removed.

## Evidence Boundary

This proves the checked-in migration can create the current schema on an empty PostgreSQL 16 database and that the scripted logical backup can be restored and verified on synthetic local data. It does not prove:

- an AWS production database exists or received the migration;
- encrypted RDS automated backups or 30-day retention;
- a production restore point inside the 4-hour RPO;
- an 8-hour production service RTO;
- production application cutover, rollback, observability, or live smoke.

Controlled external pilot and production remain `NO-GO` under the current Constitution audit. Exact-change GitHub Actions evidence must pass before this branch is merge-ready.

## Application Verification

- Authorization policy tests: 8 passed.
- ESLint: passed.
- Optimized Next.js build: passed; 42 routes generated or registered.
- Authenticated strict-data smoke: passed against the migrated PostgreSQL database, including anonymous fail-closed checks, login, tenant-boundary rejection, seeded API reads, saved-search/SAM sync behavior, AI mock behavior, role permissions, and cross-organization workflow-assignee denial.
- Post-smoke migration status: up to date.
- Post-smoke schema drift: none.
- Cleanup: application server stopped, temporary restore database absent, disposable source database dropped, and local PostgreSQL service stopped.

`npm audit --omit=dev --audit-level=high` remains a failed gate with seven high-severity advisories in the pre-existing dependency graph, including Next.js and Prisma-transitive findings. This change adds no dependency. Dependency remediation requires its own framework/ORM compatibility pass and remains part of the production `NO-GO` boundary.

## Exact-Change CI

- Code-bearing commit: `faf12da24b25bb3313646cbec4cc744da41c68da`.
- Workflow: `Demo Smoke`.
- Run: [33997205002](https://github.com/Shockvaluemedia/govcon-operator/actions/runs/33997205002).
- Started: `2026-09-05T22:54:16Z`.
- Completed: `2026-09-05T22:55:40Z`.
- Result: passed in 1 minute 24 seconds.
- Successful gates: dependency install, lint, authorization tests, fresh migration deploy/status/drift, seed, PostgreSQL backup/restore rehearsal, optimized build, application readiness, authenticated demo smoke, and container cleanup.

The final documentation-only evidence commit must also pass the same workflow before the pull request head is merge-ready.
