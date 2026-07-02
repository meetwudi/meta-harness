#!/usr/bin/env node
// Harness-Requirement: proj-quartz.legacy-conversation-owner-migration
// Harness-Requirement: proj-quartz.conversation-user-actor-ownership
// Harness-Migration-Intent: proj-quartz.migration-intent.legacy-conversations-to-owner

import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const projectRoot = resolve(appRoot, "..");
const repoRoot = resolve(projectRoot, "..");
const sourceRoot = "/libraries/knowledge-agent-conversations";
const resourceTable = "quartz_core.resources";
const usage = [
  "Usage:",
  "  npm --prefix proj-quartz/app run migrate:legacy-conversations -- --email meetwudi@gmail.com",
  "",
  "Options:",
  "  --email <email>             Required owner account email.",
  "  --dry-run                   Inspect without moving rows.",
].join("\n");

const args = parseArgs(process.argv.slice(2));
if (!args.email) {
  throw new Error(`${usage}\n\nMissing required --email.`);
}

loadEnvConfig(projectRoot, process.env.NODE_ENV !== "production", console, true);
const connectionString = process.env.QUARTZ_POSTGRES_URL;
if (!connectionString) {
  throw new Error("QUARTZ_POSTGRES_URL is required for the legacy conversation migration.");
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
  const result = await migrateLegacyConversations(pool, {
    email: args.email,
    dryRun: args.dryRun,
  });
  console.log(JSON.stringify(result, null, 2));
} finally {
  await pool.end?.();
}

async function migrateLegacyConversations(pool, input) {
  if (typeof pool.connect !== "function") {
    throw new Error("Postgres migration requires a pooled query client.");
  }

  const client = await pool.connect();
  await client.query("BEGIN");
  try {
    const owner = await loadOwner(client, input.email);
    const targetRoot = `/libraries/users/${owner.userId}/knowledge-agent-conversations`;
    const actorUris = [owner.userActorUri];
    const migrationActorUris = [
      owner.userActorUri,
      "actor://knowledge-agent",
      "actor://proj-quartz/agent",
    ];
    await client.query("SELECT set_config('meta_harness.actor_uris', $1, true)", [
      migrationActorUris.join("\n"),
    ]);

    await assertTargetRootExists(client, targetRoot);
    const unexpected = await unexpectedLegacyRows(client);
    if (unexpected.length) {
      throw new Error(
        `Legacy conversation root contains rows outside the expected conversation shape: ${unexpected.join(", ")}`,
      );
    }

    const sourceRowCount = await legacyConversationRowCount(client);
    const conversationCount = await legacyConversationCount(client);
    const conflictRows = await conflictingTargetRows(client, targetRoot, actorUris);
    if (conflictRows.length) {
      throw new Error(
        `Target conversation resources already exist with different content or actors: ${conflictRows.join(", ")}`,
      );
    }

    let insertedRows = 0;
    let deletedRows = 0;
    let removedLegacyManifestRows = 0;
    if (!input.dryRun && sourceRowCount > 0) {
      insertedRows = await insertMigratedRows(client, targetRoot, actorUris);
      deletedRows = await deleteLegacyConversationRows(client);
      removedLegacyManifestRows = await removeLegacyRootManifests(client);
    } else if (!input.dryRun) {
      removedLegacyManifestRows = await removeLegacyRootManifests(client);
    }

    const remainingLegacyRows = await legacyRootRowCount(client);
    if (input.dryRun) {
      await client.query("ROLLBACK");
    } else {
      await client.query("COMMIT");
    }

    return {
      dryRun: input.dryRun,
      ownerEmail: owner.email,
      sourceRoot,
      targetRoot,
      userActorUri: owner.userActorUri,
      conversationCount,
      sourceRowCount,
      insertedRows,
      deletedRows,
      removedLegacyManifestRows,
      remainingLegacyRows: input.dryRun ? remainingLegacyRows : 0,
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function loadOwner(client, email) {
  const result = await client.query(
    `SELECT
       u.email,
       u.id::text AS user_id
     FROM quartz_app.users u
     WHERE lower(u.email) = lower($1)
     ORDER BY u.created_at`,
    [email],
  );
  if (result.rows.length === 0) {
    throw new Error(`No Quartz user account found for ${email}.`);
  }
  const row = result.rows[0];
  return {
    email: row.email,
    userId: row.user_id,
    userActorUri: `actor://proj-quartz/user/${row.user_id}`,
  };
}

async function assertTargetRootExists(client, targetRoot) {
  const result = await client.query(
    `SELECT 1
     FROM ${resourceTable}
     WHERE path = $1
     LIMIT 1`,
    [targetRoot],
  );
  if (result.rowCount === 0) {
    throw new Error(
      `Target user conversation Library does not exist: ${targetRoot}`,
    );
  }
}

async function unexpectedLegacyRows(client) {
  const result = await client.query(
    `SELECT path
     FROM ${resourceTable}
     WHERE (path = $1 OR path LIKE $2)
       AND path <> $1
       AND path <> $3
       AND path <> $4
       AND path NOT LIKE $5
     ORDER BY path
     LIMIT 20`,
    [
      sourceRoot,
      `${sourceRoot}/%`,
      `${sourceRoot}/LIBRARY.toml`,
      `${sourceRoot}/MEMORY.toml`,
      `${sourceRoot}/quartz-%`,
    ],
  );
  return result.rows.map((row) => row.path);
}

async function legacyConversationRowCount(client) {
  const result = await client.query(
    `SELECT count(*)::int AS count
     FROM ${resourceTable}
     WHERE path LIKE $1`,
    [`${sourceRoot}/quartz-%`],
  );
  return result.rows[0]?.count ?? 0;
}

async function legacyConversationCount(client) {
  const result = await client.query(
    `SELECT count(DISTINCT split_part(path, '/', 4))::int AS count
     FROM ${resourceTable}
     WHERE path LIKE $1`,
    [`${sourceRoot}/quartz-%`],
  );
  return result.rows[0]?.count ?? 0;
}

async function legacyRootRowCount(client) {
  const result = await client.query(
    `SELECT count(*)::int AS count
     FROM ${resourceTable}
     WHERE path = $1 OR path LIKE $2`,
    [sourceRoot, `${sourceRoot}/%`],
  );
  return result.rows[0]?.count ?? 0;
}

async function conflictingTargetRows(client, targetRoot, actorUris) {
  const result = await client.query(
    `WITH source_rows AS (
       SELECT
         path AS source_path,
         $2 || substring(path FROM char_length($1) + 1) AS target_path,
         content,
         metadata,
         is_container
       FROM ${resourceTable}
       WHERE path LIKE $3
     )
     SELECT source_rows.target_path
     FROM source_rows
     JOIN ${resourceTable} target_rows
       ON target_rows.path = source_rows.target_path
     WHERE target_rows.content IS DISTINCT FROM source_rows.content
        OR target_rows.metadata IS DISTINCT FROM source_rows.metadata
        OR target_rows.is_container IS DISTINCT FROM source_rows.is_container
        OR target_rows.read_actors IS DISTINCT FROM $4::text[]
        OR target_rows.update_actors IS DISTINCT FROM $4::text[]
     ORDER BY source_rows.target_path
     LIMIT 20`,
    [sourceRoot, targetRoot, `${sourceRoot}/quartz-%`, actorUris],
  );
  return result.rows.map((row) => row.target_path);
}

async function insertMigratedRows(client, targetRoot, actorUris) {
  const result = await client.query(
    `INSERT INTO ${resourceTable}
       (path, content, metadata, is_container, created_at, updated_at, read_actors, update_actors)
     SELECT
       $2 || substring(path FROM char_length($1) + 1),
       content,
       metadata,
       is_container,
       created_at,
       updated_at,
       $4::text[],
       $4::text[]
     FROM ${resourceTable}
     WHERE path LIKE $3
     ON CONFLICT (path) DO NOTHING`,
    [sourceRoot, targetRoot, `${sourceRoot}/quartz-%`, actorUris],
  );
  return result.rowCount ?? 0;
}

async function deleteLegacyConversationRows(client) {
  const result = await client.query(
    `DELETE FROM ${resourceTable}
     WHERE path LIKE $1`,
    [`${sourceRoot}/quartz-%`],
  );
  return result.rowCount ?? 0;
}

async function removeLegacyRootManifests(client) {
  const result = await client.query(
    `DELETE FROM ${resourceTable}
     WHERE path = ANY($1::text[])`,
    [
      [
        sourceRoot,
        `${sourceRoot}/LIBRARY.toml`,
        `${sourceRoot}/MEMORY.toml`,
      ],
    ],
  );
  return result.rowCount ?? 0;
}

function parseArgs(argv) {
  const parsed = {
    dryRun: false,
    email: "",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--dry-run") {
      parsed.dryRun = true;
      continue;
    }
    if (value === "--email") {
      parsed.email = requiredNext(argv, index, value);
      index += 1;
      continue;
    }
    if (value.startsWith("--email=")) {
      parsed.email = value.slice("--email=".length);
      continue;
    }
    throw new Error(`${usage}\n\nUnknown option: ${value}`);
  }
  parsed.email = parsed.email.trim().toLowerCase();
  return parsed;
}

function requiredNext(argv, index, option) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value.`);
  }
  return value;
}
