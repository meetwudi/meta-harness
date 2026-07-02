// Generated file. Do not edit directly; update the Spec first.
// Supports storage.spec-governed-storage-models: runs concrete migrations derived from Storage model knowledge.
// Supports storage.spec-governed-migration-intents: records migration intent provenance for generated backend migrations.
// Supports storage.postgres-schema-bootstrap: applies the Postgres resource storage bootstrap migration.
// Supports storage.resource-actor-governance: applies resource actor columns and row-level security.
// Supports storage.no-database-foreign-keys: rejects database-enforced foreign keys in generated migration SQL.
// Harness-Requirement: storage.resource-actor-governance
// Harness-Requirement: storage.no-database-foreign-keys

import { createHash } from "node:crypto";
import { postgresResourceBootstrapPlan } from "./postgres-resource-bootstrap-plan.js";

export type PostgresQueryResult<Row extends Record<string, unknown>> = {
  rows: Row[];
  rowCount?: number | null;
};

export type PostgresQueryClient = {
  query<Row extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ): Promise<PostgresQueryResult<Row>>;
};

export type PostgresStorageMigration = {
  id: string;
  storageModelIds: readonly string[];
  migrationIntentId: string;
  previousChecksums?: readonly string[];
  statements(input: PostgresStorageMigrationContext): readonly string[];
};

export type PostgresStorageMigrationInput = {
  schemaName?: string;
  tableName: string;
};

type AppliedMigrationRow = {
  id: string;
  artifact_checksum: string;
};

type PostgresStorageMigrationContext = {
  schemaName?: string;
  resourceTable: string;
  changeSetTable: string;
  proposedResourceChangeTable: string;
  indexPrefix: string;
};

export const postgresStorageMigrations: readonly PostgresStorageMigration[] = [
  {
    id: "202607010001_resource_storage_bootstrap",
    storageModelIds: [postgresResourceBootstrapPlan.storageModelId],
    migrationIntentId: postgresResourceBootstrapPlan.migrationIntentId,
    statements(input) {
      return [
        `CREATE TABLE IF NOT EXISTS ${input.resourceTable} (
           ${postgresResourceBootstrapPlan.tableEntries.join(",\n           ")}
         )`,
        ...postgresResourceBootstrapPlan.indexes.map((index) =>
          `CREATE INDEX IF NOT EXISTS ${quoteIdentifier(`${input.indexPrefix}_${index.suffix}`)}
           ON ${input.resourceTable} ${index.expression}`
        ),
      ];
    },
  },
  {
    id: "202607010002_resource_actor_governance",
    storageModelIds: [postgresResourceBootstrapPlan.storageModelId],
    migrationIntentId: "storage.migration-intent.resource-actor-governance",
    previousChecksums: [
      "231b78370c883697ec352d8210660082f90b5346404abd572f14b559c1c0283e",
    ],
    statements(input) {
      const currentActorsFunction = qualifiedIdentifier({
        schemaName: input.schemaName,
        tableName: "meta_harness_current_actor_uris",
      });
      const actorPatternMatchesFunction = qualifiedIdentifier({
        schemaName: input.schemaName,
        tableName: "meta_harness_actor_pattern_matches",
      });
      const actorAllowedFunction = qualifiedIdentifier({
        schemaName: input.schemaName,
        tableName: "meta_harness_actor_allowed",
      });
      return [
        `CREATE OR REPLACE FUNCTION ${currentActorsFunction}()
         RETURNS text[]
         LANGUAGE sql
         STABLE
         AS $$
           SELECT CASE
             WHEN current_setting('meta_harness.actor_uris', true) IS NULL
               OR current_setting('meta_harness.actor_uris', true) = ''
             THEN ARRAY[]::text[]
             ELSE string_to_array(current_setting('meta_harness.actor_uris', true), E'\\n')
           END
         $$`,
        `CREATE OR REPLACE FUNCTION ${actorPatternMatchesFunction}(pattern text, actor_uri text)
         RETURNS boolean
         LANGUAGE plpgsql
         IMMUTABLE
         AS $$
         DECLARE
           escaped text;
         BEGIN
           IF pattern = actor_uri THEN
             RETURN true;
           END IF;
           escaped := replace(replace(replace(replace(pattern, '\\', '\\\\'), '%', '\\%'), '_', '\\_'), '*', '%');
           RETURN actor_uri LIKE escaped ESCAPE '\\';
         END;
         $$`,
        `CREATE OR REPLACE FUNCTION ${actorAllowedFunction}(allowed text[])
         RETURNS boolean
         LANGUAGE sql
         STABLE
         AS $$
           SELECT EXISTS (
             SELECT 1
             FROM unnest(COALESCE(allowed, ARRAY[]::text[])) AS pattern
             CROSS JOIN unnest(${currentActorsFunction}()) AS actor_uri
             WHERE ${actorPatternMatchesFunction}(pattern, actor_uri)
           )
         $$`,
        `ALTER TABLE ${input.resourceTable}
         ADD COLUMN IF NOT EXISTS read_actors text[] NOT NULL DEFAULT ${currentActorsFunction}()`,
        `ALTER TABLE ${input.resourceTable}
         ADD COLUMN IF NOT EXISTS update_actors text[] NOT NULL DEFAULT ${currentActorsFunction}()`,
        `ALTER TABLE ${input.resourceTable} ENABLE ROW LEVEL SECURITY`,
        `ALTER TABLE ${input.resourceTable} FORCE ROW LEVEL SECURITY`,
        `DROP POLICY IF EXISTS ${quoteIdentifier(`${input.indexPrefix}_read_actor_policy`)}
         ON ${input.resourceTable}`,
        `CREATE POLICY ${quoteIdentifier(`${input.indexPrefix}_read_actor_policy`)}
         ON ${input.resourceTable}
         FOR SELECT
         USING (${actorAllowedFunction}(read_actors))`,
        `DROP POLICY IF EXISTS ${quoteIdentifier(`${input.indexPrefix}_insert_actor_policy`)}
         ON ${input.resourceTable}`,
        `CREATE POLICY ${quoteIdentifier(`${input.indexPrefix}_insert_actor_policy`)}
         ON ${input.resourceTable}
         FOR INSERT
         WITH CHECK (${actorAllowedFunction}(update_actors))`,
        `DROP POLICY IF EXISTS ${quoteIdentifier(`${input.indexPrefix}_update_actor_policy`)}
         ON ${input.resourceTable}`,
        `CREATE POLICY ${quoteIdentifier(`${input.indexPrefix}_update_actor_policy`)}
         ON ${input.resourceTable}
         FOR UPDATE
         USING (${actorAllowedFunction}(update_actors))
         WITH CHECK (${actorAllowedFunction}(update_actors))`,
        `DROP POLICY IF EXISTS ${quoteIdentifier(`${input.indexPrefix}_delete_actor_policy`)}
         ON ${input.resourceTable}`,
        `CREATE POLICY ${quoteIdentifier(`${input.indexPrefix}_delete_actor_policy`)}
         ON ${input.resourceTable}
         FOR DELETE
         USING (${actorAllowedFunction}(update_actors))`,
      ];
    },
  },
  {
    id: "202607010003_resource_actor_governance_fail_closed",
    storageModelIds: [postgresResourceBootstrapPlan.storageModelId],
    migrationIntentId: "storage.migration-intent.resource-actor-governance",
    statements(input) {
      const currentActorsFunction = qualifiedIdentifier({
        schemaName: input.schemaName,
        tableName: "meta_harness_current_actor_uris",
      });
      return [
        `CREATE OR REPLACE FUNCTION ${currentActorsFunction}()
         RETURNS text[]
         LANGUAGE sql
         STABLE
         AS $$
           SELECT CASE
             WHEN current_setting('meta_harness.actor_uris', true) IS NULL
               OR current_setting('meta_harness.actor_uris', true) = ''
             THEN ARRAY[]::text[]
             ELSE string_to_array(current_setting('meta_harness.actor_uris', true), E'\\n')
           END
         $$`,
      ];
    },
  },
  {
    id: "202607010004_persistent_change_sets",
    storageModelIds: ["storage.model.change-sets"],
    migrationIntentId: "storage.migration-intent.persistent-change-sets",
    statements(input) {
      const actorAllowedFunction = qualifiedIdentifier({
        schemaName: input.schemaName,
        tableName: "meta_harness_actor_allowed",
      });
      return [
        `CREATE TABLE IF NOT EXISTS ${input.changeSetTable} (
           id text PRIMARY KEY,
           format text NOT NULL,
           actor_uri text NOT NULL,
           actor_uris text[] NOT NULL,
           context_filters jsonb NOT NULL DEFAULT '{}'::jsonb,
           status text NOT NULL,
           checks jsonb NOT NULL DEFAULT '[]'::jsonb,
           change_set jsonb NOT NULL,
           read_actors text[] NOT NULL,
           update_actors text[] NOT NULL,
           created_at timestamptz NOT NULL DEFAULT now(),
           updated_at timestamptz NOT NULL DEFAULT now()
         )`,
        `CREATE TABLE IF NOT EXISTS ${input.proposedResourceChangeTable} (
           id text PRIMARY KEY,
           change_set_id text NOT NULL,
           ordinal integer NOT NULL,
           uri text NOT NULL,
           library_uri text NOT NULL,
           resource_path text NOT NULL,
           baseline_sha256 text NOT NULL,
           baseline_bytes integer NOT NULL,
           proposed_sha256 text NOT NULL,
           proposed_bytes integer NOT NULL,
           proposed_content text NOT NULL,
           diff text NOT NULL,
           read_actors text[] NOT NULL,
           update_actors text[] NOT NULL,
           created_at timestamptz NOT NULL DEFAULT now(),
           updated_at timestamptz NOT NULL DEFAULT now()
         )`,
        `CREATE INDEX IF NOT EXISTS ${quoteIdentifier(`${input.indexPrefix}_change_sets_status_idx`)}
         ON ${input.changeSetTable} (status)`,
        `CREATE INDEX IF NOT EXISTS ${quoteIdentifier(`${input.indexPrefix}_proposed_changes_change_set_idx`)}
         ON ${input.proposedResourceChangeTable} (change_set_id, ordinal)`,
        `ALTER TABLE ${input.changeSetTable} ENABLE ROW LEVEL SECURITY`,
        `ALTER TABLE ${input.changeSetTable} FORCE ROW LEVEL SECURITY`,
        `ALTER TABLE ${input.proposedResourceChangeTable} ENABLE ROW LEVEL SECURITY`,
        `ALTER TABLE ${input.proposedResourceChangeTable} FORCE ROW LEVEL SECURITY`,
        `DROP POLICY IF EXISTS ${quoteIdentifier(`${input.indexPrefix}_change_sets_read_actor_policy`)}
         ON ${input.changeSetTable}`,
        `CREATE POLICY ${quoteIdentifier(`${input.indexPrefix}_change_sets_read_actor_policy`)}
         ON ${input.changeSetTable}
         FOR SELECT
         USING (${actorAllowedFunction}(read_actors))`,
        `DROP POLICY IF EXISTS ${quoteIdentifier(`${input.indexPrefix}_change_sets_insert_actor_policy`)}
         ON ${input.changeSetTable}`,
        `CREATE POLICY ${quoteIdentifier(`${input.indexPrefix}_change_sets_insert_actor_policy`)}
         ON ${input.changeSetTable}
         FOR INSERT
         WITH CHECK (${actorAllowedFunction}(update_actors))`,
        `DROP POLICY IF EXISTS ${quoteIdentifier(`${input.indexPrefix}_change_sets_update_actor_policy`)}
         ON ${input.changeSetTable}`,
        `CREATE POLICY ${quoteIdentifier(`${input.indexPrefix}_change_sets_update_actor_policy`)}
         ON ${input.changeSetTable}
         FOR UPDATE
         USING (${actorAllowedFunction}(update_actors))
         WITH CHECK (${actorAllowedFunction}(update_actors))`,
        `DROP POLICY IF EXISTS ${quoteIdentifier(`${input.indexPrefix}_proposed_changes_read_actor_policy`)}
         ON ${input.proposedResourceChangeTable}`,
        `CREATE POLICY ${quoteIdentifier(`${input.indexPrefix}_proposed_changes_read_actor_policy`)}
         ON ${input.proposedResourceChangeTable}
         FOR SELECT
         USING (${actorAllowedFunction}(read_actors))`,
        `DROP POLICY IF EXISTS ${quoteIdentifier(`${input.indexPrefix}_proposed_changes_insert_actor_policy`)}
         ON ${input.proposedResourceChangeTable}`,
        `CREATE POLICY ${quoteIdentifier(`${input.indexPrefix}_proposed_changes_insert_actor_policy`)}
         ON ${input.proposedResourceChangeTable}
         FOR INSERT
         WITH CHECK (${actorAllowedFunction}(update_actors))`,
        `DROP POLICY IF EXISTS ${quoteIdentifier(`${input.indexPrefix}_proposed_changes_update_actor_policy`)}
         ON ${input.proposedResourceChangeTable}`,
        `CREATE POLICY ${quoteIdentifier(`${input.indexPrefix}_proposed_changes_update_actor_policy`)}
         ON ${input.proposedResourceChangeTable}
         FOR UPDATE
         USING (${actorAllowedFunction}(update_actors))
         WITH CHECK (${actorAllowedFunction}(update_actors))`,
        `DROP POLICY IF EXISTS ${quoteIdentifier(`${input.indexPrefix}_proposed_changes_delete_actor_policy`)}
         ON ${input.proposedResourceChangeTable}`,
        `CREATE POLICY ${quoteIdentifier(`${input.indexPrefix}_proposed_changes_delete_actor_policy`)}
         ON ${input.proposedResourceChangeTable}
         FOR DELETE
         USING (${actorAllowedFunction}(update_actors))`,
      ];
    },
  },
];

/**
 * Applies generated Postgres storage migrations and records them in a ledger table.
 */
export async function runPostgresStorageMigrations(
  client: PostgresQueryClient,
  input: PostgresStorageMigrationInput,
): Promise<void> {
  const schemaName = input.schemaName?.trim();
  const tableName = identifierBase(input.tableName.trim());
  const migrationTable = qualifiedIdentifier({
    schemaName,
    tableName: `${tableName}_schema_migrations`,
  });
  const context: PostgresStorageMigrationContext = {
    schemaName,
    resourceTable: qualifiedIdentifier({ schemaName, tableName }),
    changeSetTable: qualifiedIdentifier({ schemaName, tableName: `${tableName}_change_sets` }),
    proposedResourceChangeTable: qualifiedIdentifier({ schemaName, tableName: `${tableName}_proposed_resource_changes` }),
    indexPrefix: tableName,
  };

  if (schemaName) {
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(schemaName)}`);
  }
  await client.query(
    `CREATE TABLE IF NOT EXISTS ${migrationTable} (
       id text PRIMARY KEY,
       storage_model_ids text[] NOT NULL,
       migration_intent_id text NOT NULL,
       artifact_checksum text NOT NULL,
       applied_at timestamptz NOT NULL DEFAULT now()
     )`,
  );

  const applied = await appliedMigrationChecksums(client, migrationTable);
  for (const migration of postgresStorageMigrations) {
    const statements = migration.statements(context);
    assertNoDatabaseForeignKeys(migration.id, statements);
    const checksum = migrationChecksum(migration, statements);
    const appliedChecksum = applied.get(migration.id);
    if (appliedChecksum) {
      if (
        appliedChecksum !== checksum &&
        !migration.previousChecksums?.includes(appliedChecksum)
      ) {
        throw new Error(`Postgres storage migration checksum mismatch: ${migration.id}`);
      }
      continue;
    }
    await applyMigration(client, migrationTable, migration, statements, checksum);
  }
}

async function appliedMigrationChecksums(
  client: PostgresQueryClient,
  migrationTable: string,
): Promise<Map<string, string>> {
  const result = await client.query<AppliedMigrationRow>(
    `SELECT id, artifact_checksum FROM ${migrationTable}`,
  );
  return new Map(result.rows.map((row) => [row.id, row.artifact_checksum]));
}

async function applyMigration(
  client: PostgresQueryClient,
  migrationTable: string,
  migration: PostgresStorageMigration,
  statements: readonly string[],
  checksum: string,
): Promise<void> {
  await client.query("BEGIN");
  try {
    for (const statement of statements) {
      await client.query(statement);
    }
    await client.query(
      `INSERT INTO ${migrationTable}
       (id, storage_model_ids, migration_intent_id, artifact_checksum)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [
        migration.id,
        [...migration.storageModelIds],
        migration.migrationIntentId,
        checksum,
      ],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

function assertNoDatabaseForeignKeys(
  migrationId: string,
  statements: readonly string[],
): void {
  const forbidden = /\b(?:foreign\s+key|references)\b/i;
  const statement = statements.find((candidate) => forbidden.test(candidate));
  if (statement) {
    throw new Error(
      `Generated Postgres storage migration ${migrationId} contains database foreign-key syntax: ${statement}`,
    );
  }
}

function migrationChecksum(
  migration: PostgresStorageMigration,
  statements: readonly string[],
): string {
  return createHash("sha256")
    .update(JSON.stringify({
      id: migration.id,
      storageModelIds: migration.storageModelIds,
      migrationIntentId: migration.migrationIntentId,
      statements,
    }))
    .digest("hex");
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
