// Generated file. Do not edit directly; update the Spec first.
// Supports storage.postgres-driver: adapts Postgres operations to Librarian storage.
// Supports storage.postgres-schema-bootstrap: bootstraps Postgres schema with raw SQL.
// Supports storage.postgres-deployment-configuration: accepts deployment-supplied schema, table, and connection configuration.
// Supports storage.driver-unit-operations: implements read, write, list, delete, mkdir, and exists.
// Supports storage.driver-query: lists stored resources through the storage driver.
// Supports librarian.postgres-backed-library-interface: backs Libraries with Postgres resources.

import { posix } from "node:path";
import { Pool } from "pg";
import type { LibrarianStorage } from "./types.js";

export type PostgresQueryResult<Row extends Record<string, unknown>> = {
  rows: Row[];
  rowCount?: number | null;
};

export type PostgresQueryClient = {
  query<Row extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ): Promise<PostgresQueryResult<Row>>;
  end?(): Promise<void>;
};

export type CreatePostgresStorageInput = {
  client: PostgresQueryClient;
  schemaName?: string;
  tableName?: string;
  autoEnsureSchema?: boolean;
};

export type CreatePostgresStorageFromConnectionStringInput =
  Omit<CreatePostgresStorageInput, "client"> & {
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
  const indexPrefix = identifierBase(tableName);
  let schemaPromise: Promise<void> | undefined;

  async function ensureSchema(): Promise<void> {
    if (input.autoEnsureSchema === false) {
      return;
    }
    schemaPromise ??= bootstrapSchema(input.client, {
      schemaName,
      table,
      pathIndexName: quoteIdentifier(`${indexPrefix}_path_prefix_idx`),
      updatedAtIndexName: quoteIdentifier(`${indexPrefix}_updated_at_idx`),
    }).catch((error) => {
      schemaPromise = undefined;
      throw error;
    });
    await schemaPromise;
  }

  async function ensureContainer(path: string): Promise<void> {
    const normalized = normalizeResourcePath(path);
    const existing = await input.client.query<Pick<ResourceRow, "is_container">>(
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
    await input.client.query(
      `INSERT INTO ${table} (path, is_container, content)
       VALUES ($1, true, NULL)
       ON CONFLICT (path) DO NOTHING`,
      [normalized],
    );
  }

  async function ensureParentContainers(path: string): Promise<void> {
    for (const container of parentDirectories(path)) {
      await ensureContainer(container);
    }
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
      const normalized = normalizeResourcePath(path);
      const result = await input.client.query<ResourceRow>(
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
    },
    async writeText(path: string, content: string) {
      await ensureSchema();
      const normalized = normalizeResourcePath(path);
      await ensureParentContainers(normalized);
      const existing = await input.client.query<Pick<ResourceRow, "is_container">>(
        `SELECT is_container FROM ${table} WHERE path = $1`,
        [normalized],
      );
      if (existing.rows[0]?.is_container) {
        throw new Error(`Postgres storage path is a container: ${normalized}`);
      }
      await input.client.query(
        `INSERT INTO ${table} (path, is_container, content, updated_at)
         VALUES ($1, false, $2, now())
         ON CONFLICT (path) DO UPDATE SET
           is_container = false,
           content = EXCLUDED.content,
           updated_at = now()`,
        [normalized, content],
      );
    },
    async deletePath(path: string) {
      await ensureSchema();
      const normalized = normalizeResourcePath(path);
      await input.client.query(
        `DELETE FROM ${table} WHERE path = $1 OR path LIKE $2`,
        [normalized, childLikePattern(normalized)],
      );
    },
    async makeDirectory(path: string) {
      await ensureSchema();
      const normalized = normalizeResourcePath(path);
      await ensureParentContainers(normalized);
      await ensureContainer(normalized);
    },
    async listDirectory(path: string) {
      await ensureSchema();
      const normalized = normalizeResourcePath(path);
      const result = await input.client.query<Pick<ResourceRow, "path" | "is_container">>(
        `SELECT path, is_container
         FROM ${table}
         WHERE path = $1 OR path LIKE $2
         ORDER BY path`,
        [normalized, childLikePattern(normalized)],
      );
      return directChildren(normalized, result.rows);
    },
    async exists(path: string) {
      await ensureSchema();
      const normalized = normalizeResourcePath(path);
      const result = await input.client.query(
        `SELECT 1 FROM ${table}
         WHERE path = $1 OR path LIKE $2
         LIMIT 1`,
        [normalized, childLikePattern(normalized)],
      );
      return (result.rowCount ?? result.rows.length) > 0;
    },
  };
}

/**
 * Creates a Postgres-backed storage driver from a connection string.
 */
export function createPostgresStorageFromConnectionString(
  input: CreatePostgresStorageFromConnectionStringInput,
): PostgresStorage {
  const pool = new Pool({
    connectionString: input.connectionString,
    allowExitOnIdle: true,
  });
  return createPostgresStorage({
    client: pool as unknown as PostgresQueryClient,
    schemaName: input.schemaName,
    tableName: input.tableName,
    autoEnsureSchema: input.autoEnsureSchema,
  });
}

async function bootstrapSchema(
  client: PostgresQueryClient,
  input: {
    schemaName?: string;
    table: string;
    pathIndexName: string;
    updatedAtIndexName: string;
  },
): Promise<void> {
  if (input.schemaName) {
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(input.schemaName)}`);
  }
  await client.query(
    `CREATE TABLE IF NOT EXISTS ${input.table} (
       path text PRIMARY KEY,
       content text,
       metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
       is_container boolean NOT NULL DEFAULT false,
       created_at timestamptz NOT NULL DEFAULT now(),
       updated_at timestamptz NOT NULL DEFAULT now(),
       CHECK (is_container OR content IS NOT NULL)
     )`,
  );
  await client.query(
    `CREATE INDEX IF NOT EXISTS ${input.pathIndexName}
     ON ${input.table} (path text_pattern_ops)`,
  );
  await client.query(
    `CREATE INDEX IF NOT EXISTS ${input.updatedAtIndexName}
     ON ${input.table} (updated_at)`,
  );
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

function identifierBase(value: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Invalid Postgres identifier: ${value}`);
  }
  return value;
}
