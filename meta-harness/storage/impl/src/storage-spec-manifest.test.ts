// Generated file. Do not edit directly; update the Spec first.
// Supports storage.spec-governed-storage-models: verifies generated artifacts cite storage model knowledge.
// Supports storage.spec-governed-migration-intents: verifies generated artifacts cite migration intent knowledge.
// Supports storage.postgres-schema-bootstrap: verifies the generated Postgres bootstrap plan carries concrete backend artifacts.
// Supports storage.no-database-foreign-keys: verifies generated Postgres migration artifacts avoid database foreign-key syntax.
// Harness-Requirement: storage.no-database-foreign-keys

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseToml } from "./parse-toml.js";
import { postgresResourceBootstrapPlan } from "./postgres-resource-bootstrap-plan.js";
import { postgresStorageMigrations } from "./postgres-storage-migrations.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const storageRoot = resolve(currentDir, "../..");

const spec = await readToml("SPEC.toml");
const model = await readToml("storage-models/resources.toml");
const changeSetModel = await readToml("storage-models/change-sets.toml");
const configurationModel = await readToml("storage-models/storage-configurations.toml");
const migrationIntent = await readToml("migration-intents/resource-storage-bootstrap.toml");
const actorGovernanceIntent = await readToml("migration-intents/resource-actor-governance.toml");
const persistentChangeSetsIntent = await readToml("migration-intents/persistent-change-sets.toml");
const noForeignKeysRequirement = await readToml("requirements/no-database-foreign-keys.toml");

assertCollection(spec, "storage_model_collections", "storage-models", "storage-models");
assertCollection(spec, "migration_intent_collections", "migration-intents", "migration-intents");

assert.equal(model.id, postgresResourceBootstrapPlan.storageModelId);
assert.equal(changeSetModel.id, "storage.model.change-sets");
assert.equal(migrationIntent.id, postgresResourceBootstrapPlan.migrationIntentId);
assert.equal(configurationModel.id, "storage.model.storage-configurations");
assert.equal(persistentChangeSetsIntent.id, "storage.migration-intent.persistent-change-sets");
assert.equal(noForeignKeysRequirement.id, "storage.no-database-foreign-keys");

assertRequirements(model, [
  "storage.shared-driver-interface",
  "storage.spec-governed-storage-models",
  "storage.no-database-foreign-keys",
]);
assertRequirements(configurationModel, [
  "storage.multiple-configured-storage-locations",
  "storage.spec-governed-storage-models",
]);
assertRequirements(changeSetModel, [
  "change-sets.persistent-change-sets",
  "change-sets.librarian-driver-change-set-contract",
  "storage.spec-governed-storage-models",
  "storage.no-database-foreign-keys",
]);
assertRequirements(migrationIntent, [
  "storage.postgres-schema-bootstrap",
  "storage.spec-governed-migration-intents",
  "storage.no-database-foreign-keys",
]);
assertRequirements(actorGovernanceIntent, [
  "storage.resource-actor-governance",
  "storage.spec-governed-migration-intents",
]);
assertRequirements(persistentChangeSetsIntent, [
  "change-sets.persistent-change-sets",
  "change-sets.librarian-driver-change-set-contract",
  "storage.spec-governed-storage-models",
  "storage.spec-governed-migration-intents",
  "storage.no-database-foreign-keys",
]);

assert.ok(
  String(model.text).includes("backend-neutral resource model"),
  "resource model should remain semantic Storage Spec knowledge",
);
assert.ok(
  String(configurationModel.text).includes("multiple named storage locations"),
  "storage configuration model should cover multiple storage locations",
);
assert.ok(
  String(changeSetModel.text).includes("backend-neutral model"),
  "change-set model should remain semantic Storage Spec knowledge",
);
assert.ok(
  String(migrationIntent.text).includes("backend artifacts"),
  "migration intent should describe generated backend artifacts",
);
assert.ok(
  String(actorGovernanceIntent.text).includes("row-level security"),
  "actor governance intent should describe row-level security",
);
assert.ok(
  String(persistentChangeSetsIntent.text).includes("durable change-set records"),
  "persistent change-set intent should describe generated durable records",
);

assert.deepEqual(postgresStorageMigrations.map((migration) => ({
  id: migration.id,
  storageModelIds: migration.storageModelIds,
  migrationIntentId: migration.migrationIntentId,
})), [
  {
    id: "202607010001_resource_storage_bootstrap",
    storageModelIds: [postgresResourceBootstrapPlan.storageModelId],
    migrationIntentId: postgresResourceBootstrapPlan.migrationIntentId,
  },
  {
    id: "202607010002_resource_actor_governance",
    storageModelIds: [postgresResourceBootstrapPlan.storageModelId],
    migrationIntentId: "storage.migration-intent.resource-actor-governance",
  },
  {
    id: "202607010003_resource_actor_governance_fail_closed",
    storageModelIds: [postgresResourceBootstrapPlan.storageModelId],
    migrationIntentId: "storage.migration-intent.resource-actor-governance",
  },
  {
    id: "202607010004_persistent_change_sets",
    storageModelIds: ["storage.model.change-sets"],
    migrationIntentId: "storage.migration-intent.persistent-change-sets",
  },
]);

assert.deepEqual(postgresResourceBootstrapPlan.tableEntries, [
  "path text PRIMARY KEY",
  "content text",
  "metadata jsonb NOT NULL DEFAULT '{}'::jsonb",
  "is_container boolean NOT NULL DEFAULT false",
  "created_at timestamptz NOT NULL DEFAULT now()",
  "updated_at timestamptz NOT NULL DEFAULT now()",
  "CHECK (is_container OR content IS NOT NULL)",
]);
assert.deepEqual(postgresResourceBootstrapPlan.indexes, [
  {
    suffix: "path_prefix_idx",
    expression: "(path text_pattern_ops)",
  },
  {
    suffix: "updated_at_idx",
    expression: "(updated_at)",
  },
]);

for (const migration of postgresStorageMigrations) {
  const statements = migration.statements({
    schemaName: "quartz_core",
    resourceTable: '"quartz_core"."resources"',
    changeSetTable: '"quartz_core"."resources_change_sets"',
    proposedResourceChangeTable: '"quartz_core"."resources_proposed_resource_changes"',
    indexPrefix: "resources",
  });
  assert.equal(
    statements.some((statement) => /\b(?:foreign\s+key|references)\b/i.test(statement)),
    false,
    `${migration.id} should not emit database foreign-key syntax`,
  );
}

async function readToml(path: string): Promise<Record<string, unknown>> {
  return parseToml(await readFile(resolve(storageRoot, path), "utf8"));
}

function assertCollection(
  spec: Record<string, unknown>,
  key: string,
  name: string,
  location: string,
): void {
  const collections = spec[key];
  assert.ok(Array.isArray(collections), `${key} should be a collection list`);
  assert.ok(
    collections.some((collection) =>
      isRecord(collection) &&
      collection.name === name &&
      collection.location === location
    ),
    `${key} should include ${name}`,
  );
}

function assertRequirements(record: Record<string, unknown>, expected: string[]): void {
  const requirements = record.requirements;
  assert.ok(Array.isArray(requirements), `${String(record.id)} should list requirements`);
  for (const requirement of expected) {
    assert.ok(
      requirements.includes(requirement),
      `${String(record.id)} should include ${requirement}`,
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
