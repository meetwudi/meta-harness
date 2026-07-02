#!/usr/bin/env node
// Harness-Requirement: proj-quartz.organization-resource-actors
// Harness-Requirement: proj-quartz.library-editor-actor-context-filter
// Harness-Requirement: proj-quartz.library-editor-browse-readable
// Harness-Migration-Intent: proj-quartz.migration-intent.library-manifest-actors-to-owner

import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const projectRoot = resolve(appRoot, "..");
const repoRoot = resolve(projectRoot, "..");
const resourceTable = "quartz_core.resources";
const usage = [
  "Usage:",
  "  npm --prefix proj-quartz/app run migrate:library-manifest-actors -- --email meetwudi@gmail.com --organization-id <uuid>",
  "",
  "Options:",
  "  --email <email>             Required owner account email.",
  "  --organization-id <uuid>    Required when the owner belongs to multiple organizations.",
  "  --dry-run                   Inspect without updating manifests.",
].join("\n");

const args = parseArgs(process.argv.slice(2));
if (!args.email) {
  throw new Error(`${usage}\n\nMissing required --email.`);
}

loadEnvConfig(projectRoot, process.env.NODE_ENV !== "production", console, true);
const connectionString = process.env.QUARTZ_POSTGRES_URL;
if (!connectionString) {
  throw new Error("QUARTZ_POSTGRES_URL is required for the Library manifest actor migration.");
}

const librarianModuleUrl = pathToFileURL(
  resolve(repoRoot, "meta-harness/librarian/impl/dist/index.js"),
).href;
const librarian = await import(librarianModuleUrl).catch((error) => {
  throw new Error(
    `Build the Librarian package before running this migration: npm --prefix meta-harness/librarian/impl run build\n${error instanceof Error ? error.message : String(error)}`,
  );
});

const pool = librarian.createPostgresQueryClientFromConnectionString({
  connectionString,
});

try {
  const result = await migrateLibraryManifestActors(pool, {
    email: args.email,
    organizationId: args.organizationId,
    dryRun: args.dryRun,
    parseToml: librarian.parseToml,
  });
  console.log(JSON.stringify(result, null, 2));
} finally {
  await pool.end?.();
}

async function migrateLibraryManifestActors(pool, input) {
  if (typeof pool.connect !== "function") {
    throw new Error("Postgres migration requires a pooled query client.");
  }

  const client = await pool.connect();
  await client.query("BEGIN");
  try {
    const owner = await loadOwner(client, input.email, input.organizationId);
    await client.query("SELECT set_config('meta_harness.actor_uris', $1, true)", [
      [owner.userActorUri, owner.organizationActorUri].join("\n"),
    ]);
    const rows = await loadTargetLibraryManifestRows(client, owner);
    const updates = [];

    for (const row of rows) {
      const nextContent = renderLibraryToml(
        input.parseToml(row.content),
        row.read_actors,
        row.update_actors,
        row.path,
      );
      if (nextContent !== row.content) {
        updates.push({
          path: row.path,
          readActors: row.read_actors,
          updateActors: row.update_actors,
          nextContent,
        });
      }
    }

    if (!input.dryRun) {
      for (const update of updates) {
        await client.query(
          `UPDATE ${resourceTable}
           SET content = $2,
               updated_at = now()
           WHERE path = $1`,
          [update.path, update.nextContent],
        );
      }
      await client.query("COMMIT");
    } else {
      await client.query("ROLLBACK");
    }

    return {
      dryRun: input.dryRun,
      ownerEmail: owner.email,
      organizationName: owner.organizationName,
      organizationActorUri: owner.organizationActorUri,
      scannedManifests: rows.length,
      updatedManifests: updates.length,
      paths: updates.map((update) => update.path),
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function loadOwner(client, email, organizationId) {
  const result = await client.query(
    `SELECT
       u.id::text AS user_id,
       u.email,
       o.id::text AS organization_id,
       o.name AS organization_name,
       o.actor_uri AS organization_actor_uri
     FROM quartz_app.organization_profiles p
     JOIN quartz_app.users u ON u.id = p.user_id
     JOIN quartz_app.organizations o ON o.id = p.organization_id
     WHERE lower(u.email) = lower($1)
       AND ($2::uuid IS NULL OR o.id = $2::uuid)
     ORDER BY p.created_at`,
    [email, organizationId ?? null],
  );
  if (result.rows.length === 0) {
    throw new Error(`No Quartz organization profile found for ${email}.`);
  }
  if (result.rows.length > 1) {
    throw new Error(
      `${email} belongs to multiple organizations; pass --organization-id explicitly.`,
    );
  }
  const row = result.rows[0];
  return {
    email: row.email,
    userActorUri: `actor://proj-quartz/user/${safeActorSegment(row.user_id)}`,
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    organizationActorUri: row.organization_actor_uri,
  };
}

async function loadTargetLibraryManifestRows(client, owner) {
  const result = await client.query(
    `SELECT path, content, read_actors, update_actors
     FROM ${resourceTable}
     WHERE path LIKE '/libraries/%/LIBRARY.toml'
       AND is_container = false
       AND content IS NOT NULL
       AND (
         read_actors @> $1::text[]
         OR update_actors @> $1::text[]
         OR read_actors @> $2::text[]
         OR update_actors @> $2::text[]
       )
     ORDER BY path`,
    [
      [owner.organizationActorUri],
      [owner.userActorUri],
    ],
  );
  return result.rows;
}

function renderLibraryToml(record, readActors, updateActors, path) {
  assertSupportedFields(record, path);
  const name = requiredString(record.name, path, "name");
  const description = optionalString(record.description, path, "description");
  const isSystemLibrary = record.isSystemLibrary === true;
  const agentExcludes = optionalStringArray(record.agent_excludes, path, "agent_excludes");
  const lines = [
    "# This is a Harness primitive.",
    "# See also: library://meta-harness",
    "",
    `name = ${tomlString(name)}`,
    `isSystemLibrary = ${isSystemLibrary ? "true" : "false"}`,
  ];
  if (description) {
    lines.push(`description = ${tomlString(description)}`);
  }
  lines.push(
    `read_actors = ${tomlStringArray(readActors)}`,
    `update_actors = ${tomlStringArray(updateActors)}`,
  );
  if (agentExcludes.length) {
    lines.push(`agent_excludes = ${tomlStringArray(agentExcludes)}`);
  }
  lines.push("");
  return lines.join("\n");
}

function assertSupportedFields(record, path) {
  const supported = new Set([
    "name",
    "description",
    "isSystemLibrary",
    "read_actors",
    "update_actors",
    "agent_excludes",
  ]);
  const unknown = Object.keys(record).filter((key) => !supported.has(key));
  if (unknown.length) {
    throw new Error(`${path} has unsupported Library manifest fields: ${unknown.join(", ")}`);
  }
}

function requiredString(value, path, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${path} is missing required string field: ${field}`);
  }
  return value;
}

function optionalString(value, path, field) {
  if (value === undefined) {
    return "";
  }
  if (typeof value !== "string") {
    throw new Error(`${path} has invalid string field: ${field}`);
  }
  return value;
}

function optionalStringArray(value, path, field) {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${path} has invalid string array field: ${field}`);
  }
  return value;
}

function parseArgs(argv) {
  const parsed = {
    dryRun: false,
    email: "",
    organizationId: undefined,
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
    if (value === "--organization-id") {
      parsed.organizationId = requiredNext(argv, index, value);
      index += 1;
      continue;
    }
    if (value.startsWith("--organization-id=")) {
      parsed.organizationId = value.slice("--organization-id=".length);
      continue;
    }
    throw new Error(`${usage}\n\nUnknown option: ${value}`);
  }
  parsed.email = parsed.email.trim().toLowerCase();
  if (parsed.organizationId !== undefined) {
    parsed.organizationId = parsed.organizationId.trim();
  }
  return parsed;
}

function requiredNext(argv, index, option) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value.`);
  }
  return value;
}

function tomlString(value) {
  return JSON.stringify(value);
}

function tomlStringArray(values) {
  return `[${values.map(tomlString).join(", ")}]`;
}

function safeActorSegment(value) {
  const segment = value.trim().replace(/[^A-Za-z0-9._-]/g, "_");
  if (!segment) {
    throw new Error("Actor segment must contain URL-safe characters.");
  }
  return segment;
}
