// Generated file. Do not edit directly; update the Spec first.
// Supports storage.postgres-driver: adapts Postgres operations to Librarian storage.
// Supports storage.postgres-schema-bootstrap: runs generated Postgres storage migrations with raw SQL.
// Supports storage.postgres-deployment-configuration: accepts deployment-supplied schema, table, and connection configuration.
// Supports storage.driver-unit-operations: implements read, write, list, delete, mkdir, and exists.
// Supports storage.driver-query: lists stored resources through the storage driver.
// Supports librarian.postgres-backed-library-interface: backs Libraries with Postgres resources.
// Supports librarian.spec-governed-storage-bootstrap: consumes the generated Storage Spec bootstrap plan.
// Harness-Requirement: storage.resource-actor-governance
// Harness-Requirement: librarian.driver-change-set-application
// Harness-Requirement: change-sets.persistent-change-sets

import { posix } from "node:path";
import { Pool } from "pg";
import { runPostgresStorageMigrations } from "../../../storage/impl/dist/postgres-storage-migrations.js";
import { sha256Text } from "./storage-change-set-hooks.js";
import type {
  LibrarianStorage,
  StorageChangeSetApplyResult,
  StorageChangeSetConflict,
  StorageChangeSetListInput,
  StorageChangeSetPreview,
  StorageChangeSetTextChange,
  StoragePersistedChangeSet,
} from "./types.js";

export type PostgresQueryResult<Row extends Record<string, unknown>> = {
  rows: Row[];
  rowCount?: number | null;
};

export type PostgresQueryClient = {
  query<Row extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ): Promise<PostgresQueryResult<Row>>;
  connect?(): Promise<PostgresPooledQueryClient>;
  end?(): Promise<void>;
};

type PostgresPooledQueryClient = {
  query<Row extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ): Promise<PostgresQueryResult<Row>>;
  release(error?: Error | boolean): void;
};

export type CreatePostgresStorageInput = {
  client: PostgresQueryClient;
  schemaName?: string;
  tableName?: string;
  autoEnsureSchema?: boolean;
  actorUris?: string[];
  defaultReadActors?: string[];
  defaultUpdateActors?: string[];
};

export type CreatePostgresStorageFromConnectionStringInput =
  Omit<CreatePostgresStorageInput, "client"> & {
    connectionString: string;
  };

export type CreatePostgresQueryClientFromConnectionStringInput = {
  connectionString: string;
};

export type PostgresStorage = LibrarianStorage & {
  ensureSchema(): Promise<void>;
  close(): Promise<void>;
};

type ResourceRow = {
  path: string;
  content: string | null;
  is_container: boolean;
};

type ChangeSetRow = {
  change_set: StoragePersistedChangeSet;
};

const defaultTableName = "meta_harness_resources";

/**
 * Creates a Postgres-backed Librarian storage driver from a query client.
 */
export function createPostgresStorage(
  input: CreatePostgresStorageInput,
): PostgresStorage {
  const schemaName = input.schemaName?.trim();
  const tableName = input.tableName?.trim() || defaultTableName;
  const table = qualifiedIdentifier({ schemaName, tableName });
  const changeSetTable = qualifiedIdentifier({ schemaName, tableName: `${tableName}_change_sets` });
  const proposedResourceChangeTable = qualifiedIdentifier({
    schemaName,
    tableName: `${tableName}_proposed_resource_changes`,
  });
  const actorUris = normalizedActors(input.actorUris, ["actor://knowledge-agent"]);
  const defaultReadActors = normalizedActors(input.defaultReadActors, actorUris);
  const defaultUpdateActors = normalizedActors(input.defaultUpdateActors, actorUris);
  let schemaPromise: Promise<void> | undefined;

  async function ensureSchema(): Promise<void> {
    if (input.autoEnsureSchema === false) {
      return;
    }
    schemaPromise ??= withActorClient(async (client) =>
      runPostgresStorageMigrations(client, {
        schemaName,
        tableName,
      })
    ).catch((error) => {
      schemaPromise = undefined;
      throw error;
    });
    await schemaPromise;
  }

  async function ensureContainer(
    client: PostgresQueryClient,
    path: string,
  ): Promise<void> {
    const normalized = normalizeResourcePath(path);
    const existing = await client.query<Pick<ResourceRow, "is_container">>(
      `SELECT is_container FROM ${table} WHERE path = $1`,
      [normalized],
    );
    const row = existing.rows[0];
    if (row) {
      if (!row.is_container) {
        throw new Error(`Postgres storage path is not a container: ${normalized}`);
      }
      return;
    }
    await client.query(
      `INSERT INTO ${table} (path, is_container, content, read_actors, update_actors)
       VALUES ($1, true, NULL, $2, $3)
       ON CONFLICT (path) DO NOTHING`,
      [normalized, defaultReadActors, defaultUpdateActors],
    );
  }

  async function ensureParentContainers(
    client: PostgresQueryClient,
    path: string,
  ): Promise<void> {
    for (const container of parentDirectories(path)) {
      await ensureContainer(client, container);
    }
  }

  async function withActorClient<T>(
    operation: (client: PostgresQueryClient) => Promise<T>,
  ): Promise<T> {
    if (input.client.connect) {
      const client = await input.client.connect();
      try {
        await setActorUris(client, actorUris, false);
        return await operation(client);
      } finally {
        await resetActorUris(client).catch(() => undefined);
        client.release();
      }
    }
    await setActorUris(input.client, actorUris, false);
    return operation(input.client);
  }

  async function withActorTransaction<T>(
    operation: (client: PostgresQueryClient) => Promise<T>,
  ): Promise<T> {
    if (!input.client.connect) {
      await setActorUris(input.client, actorUris, false);
      return operation(input.client);
    }
    const client = await input.client.connect();
    await client.query("BEGIN");
    try {
      await setActorUris(client, actorUris, true);
      const result = await operation(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async function readTextInTransaction(
    client: PostgresQueryClient,
    path: string,
  ): Promise<string> {
    const normalized = normalizeResourcePath(path);
    const result = await client.query<ResourceRow>(
      `SELECT path, content, is_container FROM ${table} WHERE path = $1`,
      [normalized],
    );
    const row = result.rows[0];
    if (!row) {
      throw new Error(`Postgres storage path does not exist: ${normalized}`);
    }
    if (row.is_container || typeof row.content !== "string") {
      throw new Error(`Postgres storage path is not a text resource: ${normalized}`);
    }
    return row.content;
  }

  async function previewTextChangesInTransaction(
    client: PostgresQueryClient,
    changes: StorageChangeSetTextChange[],
  ): Promise<StorageChangeSetPreview> {
    const conflicts: StorageChangeSetConflict[] = [];
    for (const change of changes) {
      const content = await readTextInTransaction(client, change.path);
      const currentSha256 = sha256Text(content);
      if (currentSha256 !== change.baselineSha256) {
        conflicts.push({
          path: change.path,
          baselineSha256: change.baselineSha256,
          currentSha256,
        });
      }
    }
    return { clean: conflicts.length === 0, conflicts };
  }

  return {
    async ensureSchema() {
      await ensureSchema();
    },
    async close() {
      await input.client.end?.();
    },
    async readText(path: string) {
      await ensureSchema();
      return withActorTransaction(async (client) => {
        return readTextInTransaction(client, path);
      });
    },
    async writeText(path: string, content: string) {
      await ensureSchema();
      await withActorTransaction(async (client) => {
        const normalized = normalizeResourcePath(path);
        await ensureParentContainers(client, normalized);
        const existing = await client.query<Pick<ResourceRow, "is_container">>(
          `SELECT is_container FROM ${table} WHERE path = $1`,
          [normalized],
        );
        if (existing.rows[0]?.is_container) {
          throw new Error(`Postgres storage path is a container: ${normalized}`);
        }
        await client.query(
          `INSERT INTO ${table} (path, is_container, content, read_actors, update_actors, updated_at)
           VALUES ($1, false, $2, $3, $4, now())
           ON CONFLICT (path) DO UPDATE SET
             is_container = false,
             content = EXCLUDED.content,
             read_actors = EXCLUDED.read_actors,
             update_actors = EXCLUDED.update_actors,
             updated_at = now()`,
          [normalized, content, defaultReadActors, defaultUpdateActors],
        );
      });
    },
    async deletePath(path: string) {
      await ensureSchema();
      await withActorTransaction(async (client) => {
        const normalized = normalizeResourcePath(path);
        await client.query(
          `DELETE FROM ${table} WHERE path = $1 OR path LIKE $2`,
          [normalized, childLikePattern(normalized)],
        );
      });
    },
    async makeDirectory(path: string) {
      await ensureSchema();
      await withActorTransaction(async (client) => {
        const normalized = normalizeResourcePath(path);
        await ensureParentContainers(client, normalized);
        await ensureContainer(client, normalized);
      });
    },
    async listDirectory(path: string) {
      await ensureSchema();
      return withActorTransaction(async (client) => {
        const normalized = normalizeResourcePath(path);
        const result = await client.query<Pick<ResourceRow, "path" | "is_container">>(
          `SELECT path, is_container
           FROM ${table}
           WHERE path = $1 OR path LIKE $2
           ORDER BY path`,
          [normalized, childLikePattern(normalized)],
        );
        return directChildren(normalized, result.rows);
      });
    },
    async exists(path: string) {
      await ensureSchema();
      return withActorTransaction(async (client) => {
        const normalized = normalizeResourcePath(path);
        const result = await client.query(
          `SELECT 1 FROM ${table}
           WHERE path = $1 OR path LIKE $2
           LIMIT 1`,
          [normalized, childLikePattern(normalized)],
        );
        return (result.rowCount ?? result.rows.length) > 0;
      });
    },
    async readChangeSetBaseline(path: string) {
      await ensureSchema();
      return withActorTransaction(async (client) => {
        const content = await readTextInTransaction(client, path);
        return {
          content,
          sha256: sha256Text(content),
          bytes: Buffer.byteLength(content, "utf8"),
        };
      });
    },
    async previewChangeSetApply(changes: StorageChangeSetTextChange[]) {
      await ensureSchema();
      return withActorTransaction((client) =>
        previewTextChangesInTransaction(client, changes)
      );
    },
    async applyChangeSet(changes: StorageChangeSetTextChange[]) {
      await ensureSchema();
      return withActorTransaction(async (client) => {
        const preview = await previewTextChangesInTransaction(client, changes);
        if (!preview.clean) {
          throw new Error("Proposed changes conflict with current Postgres storage state.");
        }
        const applied: StorageChangeSetApplyResult[] = [];
        for (const change of changes) {
          const normalized = normalizeResourcePath(change.path);
          const existing = await client.query<Pick<ResourceRow, "is_container">>(
            `SELECT is_container FROM ${table} WHERE path = $1`,
            [normalized],
          );
          if (!existing.rows[0]) {
            throw new Error(`Postgres storage path does not exist: ${normalized}`);
          }
          if (existing.rows[0]?.is_container) {
            throw new Error(`Postgres storage path is a container: ${normalized}`);
          }
          await client.query(
            `UPDATE ${table}
             SET is_container = false,
                 content = $2,
                 updated_at = now()
             WHERE path = $1`,
            [normalized, change.content],
          );
          applied.push({
            path: normalized,
            sha256: sha256Text(change.content),
            bytesWritten: Buffer.byteLength(change.content, "utf8"),
          });
        }
        return applied;
      });
    },
    async persistChangeSet(_storePath: string, record: StoragePersistedChangeSet) {
      await ensureSchema();
      await withActorTransaction(async (client) => {
        const readActors = record.actorUris.length > 0 ? record.actorUris : defaultReadActors;
        const updateActors = record.actorUris.length > 0 ? record.actorUris : defaultUpdateActors;
        await client.query(
          `INSERT INTO ${changeSetTable}
             (id, format, actor_uri, actor_uris, context_filters, status, checks, change_set, read_actors, update_actors, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7::jsonb, $8::jsonb, $9, $10, $11::timestamptz, $12::timestamptz)
           ON CONFLICT (id) DO UPDATE SET
             format = EXCLUDED.format,
             actor_uri = EXCLUDED.actor_uri,
             actor_uris = EXCLUDED.actor_uris,
             context_filters = EXCLUDED.context_filters,
             status = EXCLUDED.status,
             checks = EXCLUDED.checks,
             change_set = EXCLUDED.change_set,
             read_actors = EXCLUDED.read_actors,
             update_actors = EXCLUDED.update_actors,
             updated_at = EXCLUDED.updated_at`,
          [
            record.id,
            record.format,
            record.actorUri,
            record.actorUris,
            JSON.stringify(record.contextFilters),
            record.status,
            JSON.stringify(record.checks),
            JSON.stringify(record),
            readActors,
            updateActors,
            record.createdAt,
            record.updatedAt,
          ],
        );
        await client.query(
          `DELETE FROM ${proposedResourceChangeTable} WHERE change_set_id = $1`,
          [record.id],
        );
        for (const [index, change] of record.changes.entries()) {
          await client.query(
            `INSERT INTO ${proposedResourceChangeTable}
               (id, change_set_id, ordinal, uri, library_uri, resource_path, baseline_sha256, baseline_bytes, proposed_sha256, proposed_bytes, proposed_content, diff, read_actors, update_actors, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::timestamptz, $16::timestamptz)
             ON CONFLICT (id) DO UPDATE SET
               ordinal = EXCLUDED.ordinal,
               uri = EXCLUDED.uri,
               library_uri = EXCLUDED.library_uri,
               resource_path = EXCLUDED.resource_path,
               baseline_sha256 = EXCLUDED.baseline_sha256,
               baseline_bytes = EXCLUDED.baseline_bytes,
               proposed_sha256 = EXCLUDED.proposed_sha256,
               proposed_bytes = EXCLUDED.proposed_bytes,
               proposed_content = EXCLUDED.proposed_content,
               diff = EXCLUDED.diff,
               read_actors = EXCLUDED.read_actors,
               update_actors = EXCLUDED.update_actors,
               updated_at = EXCLUDED.updated_at`,
            [
              `${record.id}:${index}`,
              record.id,
              index,
              change.uri,
              change.libraryUri,
              change.resourcePath,
              change.baselineSha256,
              change.baselineBytes,
              change.proposedSha256,
              change.proposedBytes,
              change.proposedContent,
              change.diff,
              readActors,
              updateActors,
              record.createdAt,
              record.updatedAt,
            ],
          );
        }
      });
    },
    async listChangeSets(_storePath: string, listInput: StorageChangeSetListInput = {}) {
      await ensureSchema();
      return withActorTransaction(async (client) => {
        const result = await client.query<ChangeSetRow>(
          `SELECT change_set
           FROM ${changeSetTable}
           WHERE ($1::text IS NULL OR status = $1)
           ORDER BY updated_at DESC`,
          [listInput.status ?? null],
        );
        return result.rows
          .map((row) => row.change_set)
          .filter((record) => persistedChangeSetMatches(record, listInput));
      });
    },
    async readChangeSet(_storePath: string, changeSetId: string) {
      await ensureSchema();
      return withActorTransaction(async (client) => {
        const result = await client.query<ChangeSetRow>(
          `SELECT change_set FROM ${changeSetTable} WHERE id = $1`,
          [changeSetId],
        );
        return result.rows[0]?.change_set ?? null;
      });
    },
  };
}

/**
 * Creates a Postgres-backed storage driver from a connection string.
 */
export function createPostgresStorageFromConnectionString(
  input: CreatePostgresStorageFromConnectionStringInput,
): PostgresStorage {
  const pool = createPostgresQueryClientFromConnectionString(input);
  return createPostgresStorage({
    client: pool as unknown as PostgresQueryClient,
    schemaName: input.schemaName,
    tableName: input.tableName,
    autoEnsureSchema: input.autoEnsureSchema,
    actorUris: input.actorUris,
    defaultReadActors: input.defaultReadActors,
    defaultUpdateActors: input.defaultUpdateActors,
  });
}

/**
 * Creates a Postgres query client from a connection string.
 */
export function createPostgresQueryClientFromConnectionString(
  input: CreatePostgresQueryClientFromConnectionStringInput,
): PostgresQueryClient {
  return new Pool({
    connectionString: input.connectionString,
    allowExitOnIdle: true,
  }) as unknown as PostgresQueryClient;
}

function normalizeResourcePath(path: string): string {
  const raw = path.trim().replace(/\\/g, "/");
  if (!raw) {
    throw new Error("Postgres storage path must be non-empty");
  }
  const absolute = raw.startsWith("/") ? raw : `/${raw}`;
  const normalized = posix.normalize(absolute);
  if (normalized === ".") {
    return "/";
  }
  return normalized === "/" ? "/" : normalized.replace(/\/+$/, "");
}

function childPrefix(path: string): string {
  return path === "/" ? "/" : `${path}/`;
}

function childLikePattern(path: string): string {
  return `${childPrefix(path)}%`;
}

function parentDirectories(path: string): string[] {
  const parents: string[] = [];
  let current = posix.dirname(path);
  while (current && current !== "." && !parents.includes(current)) {
    parents.push(current);
    if (current === "/") {
      break;
    }
    current = posix.dirname(current);
  }
  return parents.reverse();
}

function directChildren(
  directoryPath: string,
  rows: Pick<ResourceRow, "path" | "is_container">[],
): { name: string; isDirectory: boolean }[] {
  const prefix = childPrefix(directoryPath);
  const children = new Map<string, { name: string; isDirectory: boolean }>();
  for (const row of rows) {
    if (row.path === directoryPath || !row.path.startsWith(prefix)) {
      continue;
    }
    const remaining = row.path.slice(prefix.length);
    if (!remaining) {
      continue;
    }
    const [name, ...descendants] = remaining.split("/");
    const existing = children.get(name);
    children.set(name, {
      name,
      isDirectory: Boolean(existing?.isDirectory) ||
        descendants.length > 0 ||
        row.is_container,
    });
  }
  return [...children.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function persistedChangeSetMatches(
  record: StoragePersistedChangeSet,
  input: StorageChangeSetListInput,
): boolean {
  if (input.status && record.status !== input.status) {
    return false;
  }
  if (input.actorUri && record.actorUri !== input.actorUri) {
    return false;
  }
  if (input.contextActorUris?.length) {
    return input.contextActorUris.every((actorUri) =>
      record.contextFilters.actorUris.includes(actorUri)
    );
  }
  return true;
}

function qualifiedIdentifier(input: {
  schemaName?: string;
  tableName: string;
}): string {
  const table = quoteIdentifier(input.tableName);
  return input.schemaName ? `${quoteIdentifier(input.schemaName)}.${table}` : table;
}

function quoteIdentifier(value: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Invalid Postgres identifier: ${value}`);
  }
  return `"${value}"`;
}

async function setActorUris(
  client: PostgresQueryClient,
  actorUris: string[],
  isLocal: boolean,
): Promise<void> {
  await client.query(
    "SELECT set_config('meta_harness.actor_uris', $1, $2)",
    [actorUris.join("\n"), isLocal],
  );
}

async function resetActorUris(client: PostgresQueryClient): Promise<void> {
  await client.query("RESET meta_harness.actor_uris");
}

function normalizedActors(
  values: string[] | undefined,
  fallback: string[],
): string[] {
  const actors = (values?.length ? values : fallback)
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value, index, all) => all.indexOf(value) === index);
  for (const actor of actors) {
    if (!actor.startsWith("actor://")) {
      throw new Error(`Actor URI must use actor://: ${actor}`);
    }
  }
  return actors.length ? actors : fallback;
}
