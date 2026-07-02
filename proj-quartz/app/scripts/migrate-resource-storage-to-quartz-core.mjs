#!/usr/bin/env node
// Harness-Requirement: proj-quartz.project-scoped-resource-storage
// Harness-Requirement: proj-quartz.postgres-backed-libraries
// Harness-Requirement: storage.spec-governed-migration-intents
// Harness-Requirement: storage.no-database-foreign-keys
// Harness-Migration-Intent: proj-quartz.migration-intent.resource-storage-to-quartz-core

import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const projectRoot = resolve(appRoot, "..");
const repoRoot = resolve(projectRoot, "..");
const sourceSchema = "meta_harness";
const sourceTable = "resources";
const targetSchema = "quartz_core";
const targetTable = "resources";
const requiredColumns = [
  "path",
  "content",
  "metadata",
  "is_container",
  "created_at",
  "updated_at",
  "read_actors",
  "update_actors",
];

const dryRun = process.argv.slice(2).includes("--dry-run");

loadEnvConfig(projectRoot, process.env.NODE_ENV !== "production", console, true);
const connectionString = process.env.QUARTZ_POSTGRES_URL;
if (!connectionString) {
  throw new Error("QUARTZ_POSTGRES_URL is required for the Quartz resource schema migration.");
}

const librarianModuleUrl = pathToFileURL(
  resolve(repoRoot, "meta-harness/librarian/impl/dist/index.js"),
).href;
const librarianStorage = await import(librarianModuleUrl).catch((error) => {
  throw new Error(
    `Build the Librarian package before running this migration: npm --prefix meta-harness/librarian/impl run build\n${error instanceof Error ? error.message : String(error)}`,
  );
});

const pool = librarianStorage.createPostgresQueryClientFromConnectionString({
  connectionString,
});

try {
  const result = await migrateQuartzResourceStorage(pool, {
    dryRun,
    runPostgresStorageMigrations: librarianStorage.runPostgresStorageMigrations,
  });
  console.log(JSON.stringify(result, null, 2));
} finally {
  await pool.end?.();
}

async function migrateQuartzResourceStorage(pool, input) {
  if (typeof pool.connect !== "function") {
    throw new Error("Postgres migration requires a pooled query client.");
  }

  if (!input.dryRun) {
    await input.runPostgresStorageMigrations(pool, {
      schemaName: targetSchema,
      tableName: targetTable,
    });
  }

  const client = await pool.connect();
  await client.query("BEGIN");
  let rowSecurityTemporarilyDisabled = false;
  try {
    const sourceExists = await tableExists(client, sourceSchema, sourceTable);
    if (!sourceExists) {
      if (input.dryRun) {
        await client.query("ROLLBACK");
      } else {
        await client.query("COMMIT");
      }
      return {
        dryRun: input.dryRun,
        source: qualifiedName(sourceSchema, sourceTable),
        target: qualifiedName(targetSchema, targetTable),
        sourceExists: false,
        copiedRows: 0,
        sourceRows: 0,
        targetRows: await tableRowCount(client, targetSchema, targetTable),
        legacySourceRetained: true,
      };
    }

    await assertColumns(client, sourceSchema, sourceTable);
    if (input.dryRun) {
      await assertTargetTableExists(client);
    }

    const sourceRows = await tableRowCount(client, sourceSchema, sourceTable);
    const retainedExistingRows = await retainedExistingTargetRowCount(client);
    const conflictRows = await conflictingTargetRows(client);
    if (conflictRows.length) {
      throw new Error(
        `Target ${qualifiedName(targetSchema, targetTable)} contains conflicting rows: ${conflictRows.join(", ")}`,
      );
    }

    let copiedRows = 0;
    if (!input.dryRun) {
      await client.query(`ALTER TABLE ${qualifiedName(targetSchema, targetTable)} DISABLE ROW LEVEL SECURITY`);
      rowSecurityTemporarilyDisabled = true;
      copiedRows = await copyMissingRows(client);
      await client.query(`ALTER TABLE ${qualifiedName(targetSchema, targetTable)} ENABLE ROW LEVEL SECURITY`);
      await client.query(`ALTER TABLE ${qualifiedName(targetSchema, targetTable)} FORCE ROW LEVEL SECURITY`);
      rowSecurityTemporarilyDisabled = false;
    }

    const targetRows = await tableRowCount(client, targetSchema, targetTable);
    await assertNoForeignKeys(client, targetSchema);

    if (input.dryRun) {
      await client.query("ROLLBACK");
    } else {
      await client.query("COMMIT");
    }

    return {
      dryRun: input.dryRun,
      source: qualifiedName(sourceSchema, sourceTable),
      target: qualifiedName(targetSchema, targetTable),
      sourceExists: true,
      sourceRows,
      copiedRows,
      retainedExistingRows,
      targetRows,
      legacySourceRetained: true,
    };
  } catch (error) {
    if (rowSecurityTemporarilyDisabled) {
      await client.query(`ALTER TABLE ${qualifiedName(targetSchema, targetTable)} ENABLE ROW LEVEL SECURITY`).catch(() => undefined);
      await client.query(`ALTER TABLE ${qualifiedName(targetSchema, targetTable)} FORCE ROW LEVEL SECURITY`).catch(() => undefined);
    }
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function tableExists(client, schemaName, tableName) {
  const result = await client.query(
    "SELECT to_regclass($1)::text AS table_name",
    [`${schemaName}.${tableName}`],
  );
  return Boolean(result.rows[0]?.table_name);
}

async function assertTargetTableExists(client) {
  if (!(await tableExists(client, targetSchema, targetTable))) {
    throw new Error(
      `Target ${qualifiedName(targetSchema, targetTable)} does not exist. Run without --dry-run to let the generated Storage Spec migration create it.`,
    );
  }
}

async function assertColumns(client, schemaName, tableName) {
  const result = await client.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = $1
       AND table_name = $2`,
    [schemaName, tableName],
  );
  const existing = new Set(result.rows.map((row) => row.column_name));
  const missing = requiredColumns.filter((column) => !existing.has(column));
  if (missing.length) {
    throw new Error(
      `Source ${qualifiedName(schemaName, tableName)} is missing required migration columns: ${missing.join(", ")}`,
    );
  }
}

async function tableRowCount(client, schemaName, tableName) {
  if (!(await tableExists(client, schemaName, tableName))) {
    return 0;
  }
  const result = await client.query(
    `SELECT count(*)::int AS count
     FROM ${qualifiedName(schemaName, tableName)}`,
  );
  return result.rows[0]?.count ?? 0;
}

async function conflictingTargetRows(client) {
  const result = await client.query(
    `SELECT target_rows.path
     FROM ${qualifiedName(sourceSchema, sourceTable)} source_rows
     JOIN ${qualifiedName(targetSchema, targetTable)} target_rows
       ON target_rows.path = source_rows.path
     WHERE target_rows.content IS DISTINCT FROM source_rows.content
        OR target_rows.metadata IS DISTINCT FROM source_rows.metadata
        OR target_rows.is_container IS DISTINCT FROM source_rows.is_container
     ORDER BY target_rows.path
     LIMIT 20`,
  );
  return result.rows.map((row) => row.path);
}

async function retainedExistingTargetRowCount(client) {
  const result = await client.query(
    `SELECT count(*)::int AS count
     FROM ${qualifiedName(sourceSchema, sourceTable)} source_rows
     JOIN ${qualifiedName(targetSchema, targetTable)} target_rows
       ON target_rows.path = source_rows.path
     WHERE target_rows.content IS NOT DISTINCT FROM source_rows.content
       AND target_rows.metadata IS NOT DISTINCT FROM source_rows.metadata
       AND target_rows.is_container IS NOT DISTINCT FROM source_rows.is_container`,
  );
  return result.rows[0]?.count ?? 0;
}

async function copyMissingRows(client) {
  const result = await client.query(
    `INSERT INTO ${qualifiedName(targetSchema, targetTable)}
       (path, content, metadata, is_container, created_at, updated_at, read_actors, update_actors)
     SELECT
       path,
       content,
       metadata,
       is_container,
       created_at,
       updated_at,
       read_actors,
       update_actors
     FROM ${qualifiedName(sourceSchema, sourceTable)}
     ON CONFLICT (path) DO NOTHING`,
  );
  return result.rowCount ?? 0;
}

async function assertNoForeignKeys(client, schemaName) {
  const result = await client.query(
    `SELECT table_name, constraint_name
     FROM information_schema.table_constraints
     WHERE constraint_schema = $1
       AND constraint_type = 'FOREIGN KEY'
     ORDER BY table_name, constraint_name`,
    [schemaName],
  );
  if (result.rows.length) {
    throw new Error(
      `Schema ${schemaName} has database foreign-key constraints: ${result.rows.map((row) => `${row.table_name}.${row.constraint_name}`).join(", ")}`,
    );
  }
}

function qualifiedName(schemaName, tableName) {
  return `${quoteIdentifier(schemaName)}.${quoteIdentifier(tableName)}`;
}

function quoteIdentifier(value) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Invalid Postgres identifier: ${value}`);
  }
  return `"${value}"`;
}
