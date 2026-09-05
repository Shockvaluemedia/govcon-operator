#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { pipeline } from "node:stream/promises";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for the recovery rehearsal");
}

const connection = parseDatabaseUrl(databaseUrl);
const targetDatabase = `govcon_restore_${Date.now().toString(36)}_${process.pid}`;
const backupPath = resolve(tmpdir(), `${targetDatabase}.dump`);
const startedAt = new Date();

const fingerprintSql = `
SELECT json_build_object(
  'organizations', (SELECT count(*)::integer FROM organizations),
  'users', (SELECT count(*)::integer FROM users),
  'user_roles', (SELECT count(*)::integer FROM user_roles),
  'opportunities', (SELECT count(*)::integer FROM opportunities),
  'saved_opportunities', (SELECT count(*)::integer FROM saved_opportunities),
  'opportunity_searches', (SELECT count(*)::integer FROM opportunity_searches),
  'opportunity_analyses', (SELECT count(*)::integer FROM opportunity_analyses),
  'suppliers', (SELECT count(*)::integer FROM suppliers),
  'supplier_quotes', (SELECT count(*)::integer FROM supplier_quotes),
  'products', (SELECT count(*)::integer FROM products),
  'compliance_profiles', (SELECT count(*)::integer FROM compliance_profiles),
  'documents', (SELECT count(*)::integer FROM documents),
  'bid_workflows', (SELECT count(*)::integer FROM bid_workflows),
  'workflow_tasks', (SELECT count(*)::integer FROM workflow_tasks),
  'notes', (SELECT count(*)::integer FROM notes),
  'ai_messages', (SELECT count(*)::integer FROM ai_messages),
  'audit_logs', (SELECT count(*)::integer FROM audit_logs),
  'integrations', (SELECT count(*)::integer FROM integrations),
  'funding_cashflow_models', (SELECT count(*)::integer FROM funding_cashflow_models),
  'applied_migrations', (
    SELECT count(*)::integer
    FROM _prisma_migrations
    WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
  ),
  'migration_ledger_fingerprint', (
    SELECT md5(string_agg(migration_name || ':' || checksum, E'\n' ORDER BY migration_name))
    FROM _prisma_migrations
    WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
  ),
  'schema_fingerprint', (
    SELECT md5(string_agg(signature, E'\n' ORDER BY signature))
    FROM (
      SELECT
        'column:' || table_name || ':' || column_name || ':' || ordinal_position || ':' ||
        data_type || ':' || udt_name || ':' || is_nullable || ':' ||
        coalesce(column_default, '') AS signature
      FROM information_schema.columns
      WHERE table_schema = 'public'

      UNION ALL

      SELECT
        'constraint:' || conrelid::regclass::text || ':' || conname || ':' ||
        pg_get_constraintdef(oid, true) AS signature
      FROM pg_constraint
      WHERE connamespace = 'public'::regnamespace

      UNION ALL

      SELECT 'index:' || tablename || ':' || indexname || ':' || indexdef AS signature
      FROM pg_indexes
      WHERE schemaname = 'public'
    ) schema_signatures
  )
)::text;
`;

const integritySql = `
SELECT json_build_object(
  'failed_migrations', (
    SELECT count(*)::integer
    FROM _prisma_migrations
    WHERE finished_at IS NULL AND rolled_back_at IS NULL
  ),
  'orphan_users', (
    SELECT count(*)::integer
    FROM users u
    LEFT JOIN organizations o ON o.id = u.organization_id
    WHERE o.id IS NULL
  ),
  'orphan_roles', (
    SELECT count(*)::integer
    FROM user_roles ur
    LEFT JOIN users u ON u.id = ur.user_id
    LEFT JOIN organizations o ON o.id = ur.organization_id
    WHERE u.id IS NULL OR o.id IS NULL
  ),
  'cross_organization_roles', (
    SELECT count(*)::integer
    FROM user_roles ur
    JOIN users u ON u.id = ur.user_id
    WHERE ur.organization_id <> u.organization_id
  ),
  'orphan_workflows', (
    SELECT count(*)::integer
    FROM bid_workflows bw
    LEFT JOIN organizations o ON o.id = bw.organization_id
    LEFT JOIN opportunities opp ON opp.id = bw.opportunity_id
    WHERE o.id IS NULL OR opp.id IS NULL
  ),
  'cross_organization_task_assignees', (
    SELECT count(*)::integer
    FROM workflow_tasks wt
    JOIN bid_workflows bw ON bw.id = wt.workflow_id
    JOIN users u ON u.id = wt.assigned_to
    WHERE wt.assigned_to IS NOT NULL
      AND bw.organization_id <> u.organization_id
  )
)::text;
`;

let targetCreated = false;
let primaryError;
let evidence;

try {
  const toolMode = selectToolMode(connection);
  const sourceFingerprint = readJsonQuery(toolMode, connection.database, fingerprintSql);
  const sourceIntegrity = readJsonQuery(toolMode, connection.database, integritySql);

  assertRecoveryState(sourceFingerprint, sourceIntegrity, "source");

  await dumpDatabase(toolMode, connection.database, backupPath);
  const backupCompletedAt = new Date();
  const backupStats = await stat(backupPath);

  if (backupStats.size === 0) {
    throw new Error("pg_dump produced an empty backup artifact");
  }

  runSql(
    toolMode,
    "postgres",
    `CREATE DATABASE ${quoteIdentifier(targetDatabase)} TEMPLATE template0;`
  );
  targetCreated = true;

  await restoreDatabase(toolMode, targetDatabase, backupPath);
  const restoreCompletedAt = new Date();

  const restoredFingerprint = readJsonQuery(toolMode, targetDatabase, fingerprintSql);
  const restoredIntegrity = readJsonQuery(toolMode, targetDatabase, integritySql);

  assertRecoveryState(restoredFingerprint, restoredIntegrity, "restored");
  if (JSON.stringify(sourceFingerprint) !== JSON.stringify(restoredFingerprint)) {
    throw new Error(
      `Restored data fingerprint differs from source: ${JSON.stringify({
        source: sourceFingerprint,
        restored: restoredFingerprint,
      })}`
    );
  }

  runSql(toolMode, targetDatabase, writeCanarySql(targetDatabase));
  const verifiedAt = new Date();

  evidence = {
    schemaVersion: 1,
    kind: "postgres-logical-backup-restore-rehearsal",
    environment: process.env.CI ? "ci" : "local",
    sourceDatabase: connection.database,
    temporaryRestoreDatabase: targetDatabase,
    toolMode,
    startedAt: startedAt.toISOString(),
    backupCompletedAt: backupCompletedAt.toISOString(),
    restoreCompletedAt: restoreCompletedAt.toISOString(),
    verifiedAt: verifiedAt.toISOString(),
    rehearsalElapsedMs: verifiedAt.getTime() - startedAt.getTime(),
    backupBytes: backupStats.size,
    fingerprint: restoredFingerprint,
    integrity: restoredIntegrity,
  };
} catch (error) {
  primaryError = error;
}

const cleanupErrors = [];

if (targetCreated) {
  try {
    const cleanupMode = evidence?.toolMode ?? selectToolMode(connection);
    runSql(
      cleanupMode,
      "postgres",
      `DROP DATABASE IF EXISTS ${quoteIdentifier(targetDatabase)} WITH (FORCE);`
    );
  } catch (error) {
    cleanupErrors.push(`temporary database cleanup failed: ${errorMessage(error)}`);
  }
}

try {
  await rm(backupPath, { force: true });
} catch (error) {
  cleanupErrors.push(`temporary backup cleanup failed: ${errorMessage(error)}`);
}

if (primaryError || cleanupErrors.length > 0) {
  const messages = [primaryError ? errorMessage(primaryError) : null, ...cleanupErrors].filter(
    Boolean
  );
  throw new Error(messages.join("; "));
}

evidence.cleanup = {
  temporaryRestoreDatabaseDropped: true,
  temporaryBackupRemoved: true,
};

if (process.env.RECOVERY_EVIDENCE_PATH) {
  const evidencePath = resolve(process.env.RECOVERY_EVIDENCE_PATH);
  await mkdir(dirname(evidencePath), { recursive: true });
  await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
}

console.log("PostgreSQL backup/restore rehearsal passed");
console.log(JSON.stringify(evidence, null, 2));

function parseDatabaseUrl(value) {
  const parsed = new URL(value);
  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new Error("DATABASE_URL must use the PostgreSQL protocol");
  }

  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!database) throw new Error("DATABASE_URL must name a source database");

  return {
    host: parsed.hostname,
    port: parsed.port || "5432",
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database,
    sslMode: parsed.searchParams.get("sslmode"),
  };
}

function nativeEnvironment() {
  return {
    ...process.env,
    PGHOST: connection.host,
    PGPORT: connection.port,
    PGUSER: connection.user,
    PGPASSWORD: connection.password,
    ...(connection.sslMode ? { PGSSLMODE: connection.sslMode } : {}),
  };
}

function selectToolMode(config) {
  const requested = process.env.POSTGRES_TOOL_MODE || "auto";
  if (!["auto", "native", "docker-compose"].includes(requested)) {
    throw new Error(
      "POSTGRES_TOOL_MODE must be auto, native, or docker-compose"
    );
  }

  if (requested === "docker-compose") {
    assertComposeDatabase(config);
    return requested;
  }

  const nativeAvailable = ["pg_dump", "pg_restore", "psql"].every(commandExists);
  if (requested === "native") {
    if (!nativeAvailable) {
      throw new Error("Native pg_dump, pg_restore, and psql are required");
    }
    assertNativeCompatibility(config);
    return requested;
  }

  if (nativeAvailable) {
    try {
      assertNativeCompatibility(config);
      return "native";
    } catch (error) {
      if (!composeDatabaseAvailable(config)) throw error;
    }
  }

  if (composeDatabaseAvailable(config)) return "docker-compose";

  throw new Error(
    "No compatible PostgreSQL client was found. Install matching pg_dump/pg_restore/psql binaries or start the repo's Docker Compose postgres service."
  );
}

function assertNativeCompatibility(config) {
  const dumpVersion = runCapture("pg_dump", ["--version"], nativeEnvironment());
  const dumpMajor = Number(dumpVersion.match(/(\d+)(?:\.\d+)?/)?.[1]);
  const serverVersion = runCapture(
    "psql",
    psqlArguments(config.database, "SHOW server_version_num;"),
    nativeEnvironment()
  );
  const serverMajor = Math.floor(Number(serverVersion.trim()) / 10000);

  if (!dumpMajor || !serverMajor || dumpMajor < serverMajor) {
    throw new Error(
      `PostgreSQL client/server mismatch: pg_dump ${dumpMajor || "unknown"}, server ${serverMajor || "unknown"}`
    );
  }
}

function commandExists(command) {
  const result = spawnSync(command, ["--version"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return !result.error && result.status === 0;
}

function composeDatabaseAvailable(config) {
  if (!composeTargetMatches(config)) return false;

  const result = spawnSync("docker", ["compose", "ps", "-q", "postgres"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return !result.error && result.status === 0 && result.stdout.trim().length > 0;
}

function assertComposeDatabase(config) {
  if (!composeTargetMatches(config)) {
    throw new Error(
      "DATABASE_URL does not target the repository Docker Compose postgres service"
    );
  }
  if (!composeDatabaseAvailable(config)) {
    throw new Error("The repository Docker Compose postgres service is not running");
  }
}

function composeTargetMatches(config) {
  const localHosts = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
  if (!localHosts.has(config.host)) return false;

  const result = spawnSync("docker", ["compose", "port", "postgres", "5432"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error || result.status !== 0) return false;

  const publishedPorts = result.stdout
    .trim()
    .split("\n")
    .map((line) => line.match(/:(\d+)$/)?.[1])
    .filter(Boolean);
  return publishedPorts.includes(config.port);
}

function toolCommand(mode, tool, args) {
  if (mode === "native") {
    return { command: tool, args, env: nativeEnvironment() };
  }

  return {
    command: "docker",
    args: [
      "compose",
      "exec",
      "-T",
      "-u",
      "postgres",
      "postgres",
      tool,
      ...args,
    ],
    env: process.env,
  };
}

function psqlArguments(database, sql) {
  return [
    "--no-psqlrc",
    "--set",
    "ON_ERROR_STOP=1",
    "--tuples-only",
    "--no-align",
    "--dbname",
    database,
    "--command",
    sql,
  ];
}

function runSql(mode, database, sql) {
  const invocation = toolCommand(mode, "psql", psqlArguments(database, sql));
  return runCapture(invocation.command, invocation.args, invocation.env);
}

function readJsonQuery(mode, database, sql) {
  const output = runSql(mode, database, sql).trim();
  try {
    return JSON.parse(output);
  } catch {
    throw new Error(`Recovery verification returned invalid JSON: ${output.slice(0, 200)}`);
  }
}

function runCapture(command, args, env) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${command} exited ${result.status}: ${(result.stderr || result.stdout).trim()}`
    );
  }

  return result.stdout;
}

async function dumpDatabase(mode, database, outputPath) {
  const invocation = toolCommand(mode, "pg_dump", [
    "--format=custom",
    "--no-owner",
    "--no-privileges",
    "--dbname",
    database,
  ]);

  const output = createWriteStream(outputPath, { flags: "wx", mode: 0o600 });
  await streamCommand(invocation, undefined, output);
}

async function restoreDatabase(mode, database, inputPath) {
  const invocation = toolCommand(mode, "pg_restore", [
    "--exit-on-error",
    "--no-owner",
    "--no-privileges",
    "--dbname",
    database,
  ]);

  await streamCommand(invocation, createReadStream(inputPath), undefined);
}

async function streamCommand(invocation, input, output) {
  const child = spawn(invocation.command, invocation.args, {
    cwd: process.cwd(),
    env: invocation.env,
    stdio: [input ? "pipe" : "ignore", output ? "pipe" : "ignore", "pipe"],
  });

  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  const completion = new Promise((resolveCompletion, rejectCompletion) => {
    child.on("error", rejectCompletion);
    child.on("close", (code) => {
      if (code === 0) resolveCompletion();
      else rejectCompletion(new Error(`${invocation.command} exited ${code}: ${stderr.trim()}`));
    });
  });

  const streams = [completion];
  if (input) streams.push(pipeline(input, child.stdin));
  if (output) streams.push(pipeline(child.stdout, output));
  await Promise.all(streams);
}

function assertRecoveryState(fingerprint, integrity, label) {
  if (!Number.isInteger(fingerprint.applied_migrations) || fingerprint.applied_migrations < 1) {
    throw new Error(`${label} database has no completed Prisma migration`);
  }

  const violations = Object.entries(integrity).filter(([, count]) => count !== 0);
  if (violations.length > 0) {
    throw new Error(`${label} database integrity checks failed: ${JSON.stringify(violations)}`);
  }
}

function writeCanarySql(database) {
  const suffix = database.replace(/[^a-zA-Z0-9_]/g, "");
  const organizationId = `recovery-canary-org-${suffix}`;
  const userId = `recovery-canary-user-${suffix}`;

  return `
BEGIN;
INSERT INTO organizations (
  id, name, sam_registered, naics_codes, psc_codes, created_at, updated_at
) VALUES (
  '${organizationId}', 'Recovery canary', false, ARRAY[]::TEXT[], ARRAY[]::TEXT[], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);
INSERT INTO users (
  id, email, first_name, last_name, organization_id, created_at, updated_at
) VALUES (
  '${userId}', '${userId}@example.invalid', 'Recovery', 'Canary', '${organizationId}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);
INSERT INTO user_roles (
  id, user_id, organization_id, role, created_at
) VALUES (
  'recovery-canary-role-${suffix}', '${userId}', '${organizationId}', 'owner', CURRENT_TIMESTAMP
);
ROLLBACK;
`;
}

function quoteIdentifier(value) {
  if (!/^[a-zA-Z0-9_]+$/.test(value)) {
    throw new Error("Unsafe generated database identifier");
  }
  return `"${value}"`;
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
