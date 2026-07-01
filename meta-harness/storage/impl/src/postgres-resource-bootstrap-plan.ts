// Generated file. Do not edit directly; update the Spec first.
// Supports storage.spec-governed-storage-models: provides a concrete artifact derived from the Harness resource storage model.
// Supports storage.spec-governed-migration-intents: provides a concrete artifact derived from the initial resource storage bootstrap intent.
// Supports storage.postgres-schema-bootstrap: supplies raw SQL fragments for the Postgres driver bootstrap.
// Supports storage.no-database-foreign-keys: declares a resource table shape with no database-enforced foreign keys.
// Harness-Requirement: storage.spec-governed-storage-models
// Harness-Requirement: storage.spec-governed-migration-intents
// Harness-Requirement: storage.no-database-foreign-keys

export type PostgresResourceBootstrapIndex = {
  suffix: string;
  expression: string;
};

export type PostgresResourceBootstrapPlan = {
  storageModelId: string;
  migrationIntentId: string;
  tableEntries: readonly string[];
  indexes: readonly PostgresResourceBootstrapIndex[];
};

/**
 * Describes the concrete Postgres artifact generated from the Storage Spec.
 */
export const postgresResourceBootstrapPlan: PostgresResourceBootstrapPlan = {
  storageModelId: "storage.model.resources",
  migrationIntentId: "storage.migration-intent.resource-storage-bootstrap",
  tableEntries: [
    "path text PRIMARY KEY",
    "content text",
    "metadata jsonb NOT NULL DEFAULT '{}'::jsonb",
    "is_container boolean NOT NULL DEFAULT false",
    "created_at timestamptz NOT NULL DEFAULT now()",
    "updated_at timestamptz NOT NULL DEFAULT now()",
    "CHECK (is_container OR content IS NOT NULL)",
  ],
  indexes: [
    {
      suffix: "path_prefix_idx",
      expression: "(path text_pattern_ops)",
    },
    {
      suffix: "updated_at_idx",
      expression: "(updated_at)",
    },
  ],
};
