# Database Migration and Recovery Runbook

Owner: SVM owner

Applies to: GovCon Operator PostgreSQL databases managed through Prisma

Recovery classification: production customer and bid data is Tier A with an 8-hour RTO, 4-hour RPO, encrypted backups retained for at least 30 days, and quarterly restore verification. Local and CI demo data is disposable Tier C/D evidence and does not prove those production objectives.

## Invariants

- `prisma/migrations` is the immutable schema history. Never edit or rename a migration after it has been applied outside a disposable environment.
- `npm run db:deploy` is the deployment command. `prisma db push` is not an approved shared or production schema path.
- Name the account, region, environment, database target, migration commit, backup restore point, and rollback owner before any production migration.
- Back up before a migration that could change recovery behavior. Verify the backup is encrypted and restorable before proceeding.
- Never restore over the source database during a rehearsal. Restore to a new isolated database, verify it, and remove it after evidence is captured.
- Do not use `prisma migrate resolve` to conceal a failed or partially applied migration.

## Canonical Commands

All commands run from the repository root and load `.env.local` unless an explicit environment injects `DATABASE_URL`.

```bash
npm run db:deploy
npm run db:status
npm run db:drift:check
npm run db:seed
npm run db:recovery:rehearse
```

`db:recovery:rehearse` requires `pg_dump`, `pg_restore`, and `psql` compatible with the server. In local development it automatically uses the running `docker compose` PostgreSQL service when host clients are too old. The command may write metadata-only evidence when `RECOVERY_EVIDENCE_PATH` is set. The dump itself remains a mode-`0600` temporary file and is removed after verification.

## Fresh Database Deployment

1. Confirm `DATABASE_URL` targets the intended empty database without printing credentials.
2. Run `npm run db:deploy`.
3. Run `npm run db:status`; every checked-in migration must be applied.
4. Run `npm run db:drift:check`; it must report no difference.
5. Seed only an explicitly approved demo or test environment.
6. Start the exact application build and run the authenticated smoke suite.

## Existing Non-Empty Database Baseline

The initial migration represents the schema that existed before Prisma migration history was introduced. A non-empty database created with `prisma db push` will require a one-time baseline; blindly running `migrate deploy` against it will fail.

For disposable local demo data, recreate the database and follow the fresh-database procedure. For any retained or shared database:

1. Obtain owner approval and capture a restorable backup first.
2. Run `npm run db:drift:check` against that exact target.
3. Stop if any difference exists. Reconcile it through a separately reviewed migration plan.
4. Review `prisma/migrations/20260905000000_initial/migration.sql` against the target schema.
5. Only after equivalence is established, record the baseline:

```bash
npx dotenv -e .env.local -- prisma migrate resolve --applied 20260905000000_initial
```

6. Run `npm run db:status` and `npm run db:drift:check` again and retain the outputs with the approval record.

Baselining records history; it does not execute the migration SQL. Never baseline an empty database or a database with unexplained drift.

## Creating a Forward Migration

1. Change `prisma/schema.prisma` on a feature branch.
2. Against a disposable development database, run:

```bash
npm run db:migrate -- --name concise_change_name
```

3. Review the generated SQL for destructive statements, locks, table rewrites, nullability changes, default backfills, index cost, and application compatibility.
4. Document ownership, data transformation, forward compatibility, rollback/recovery, and expected runtime.
5. Run migration deploy, status, drift, seed, recovery rehearsal, build, and smoke on a fresh database in CI.
6. Merge only after required checks and owner approval.

## Production Deployment Gate

Before `npm run db:deploy` can target production, the release record must include:

- exact commit and migration names;
- AWS account, region, environment, RDS identifier, and responsible owner;
- an encrypted restore point inside the 4-hour RPO and a verified 30-day retention policy;
- expected locks/runtime and an application compatibility decision;
- rollback or restore-and-cutover steps;
- health, telemetry, alarm, and authenticated smoke evidence;
- explicit owner authorization for the production data mutation.

After deployment, record migration status, drift result, application readback, start/end timestamps, and unresolved risk. A successful local or CI run does not authorize or prove production deployment.

## Rollback and Recovery

Prisma migrations are forward-only; this repository does not maintain automatic down migrations.

- If the schema remains backward-compatible, roll back the application first and leave the applied migration recorded.
- If data/schema recovery is required, restore the approved pre-migration backup to a new database, validate migration state and application smoke there, then perform an explicitly authorized connection cutover.
- Do not overwrite the affected source database or delete it until the recovery owner accepts the restored target.
- Record incident start, backup restore point, restore start, database available, smoke complete, cutover, and service restored timestamps. The elapsed service-restoration interval is the measured RTO evidence.

## Rehearsal Verification

The automated rehearsal:

1. refuses a source without a completed Prisma migration;
2. checks for failed migrations and orphaned tenant/workflow relations;
3. creates a custom-format logical backup with owner/ACL metadata removed;
4. restores into a random temporary database;
5. compares all application-table counts plus schema and migration-ledger fingerprints;
6. checks cross-organization role and task-assignee integrity;
7. executes organization/user/role relational writes inside a rolled-back transaction;
8. drops the temporary database and removes the temporary dump;
9. emits timestamps, elapsed duration, backup size, counts, integrity results, and cleanup status without credentials or row content.

The CI rehearsal runs on synthetic seeded data for every pull request and `main` push. Production Tier A restore verification remains quarterly and before a recovery-affecting major migration.
