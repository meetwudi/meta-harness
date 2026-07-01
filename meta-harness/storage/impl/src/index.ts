// Generated file. Do not edit directly; update the Spec first.
// Supports storage.spec-governed-storage-models: exports generated storage artifacts derived from Storage Spec model knowledge.
// Supports storage.spec-governed-migration-intents: exports generated migration artifacts derived from Storage Spec migration intent knowledge.
// Harness-Requirement: storage.spec-governed-storage-models
// Harness-Requirement: storage.spec-governed-migration-intents

export { postgresResourceBootstrapPlan } from "./postgres-resource-bootstrap-plan.js";
export {
  postgresStorageMigrations,
  runPostgresStorageMigrations,
} from "./postgres-storage-migrations.js";
export type {
  PostgresResourceBootstrapIndex,
  PostgresResourceBootstrapPlan,
} from "./postgres-resource-bootstrap-plan.js";
export type {
  PostgresQueryClient,
  PostgresQueryResult,
  PostgresStorageMigration,
  PostgresStorageMigrationInput,
} from "./postgres-storage-migrations.js";
