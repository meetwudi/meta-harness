// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.storage-discovery-runtime: reads repository defaults from Meta Harness metadata.
// Supports knowledge-agent.project-config-selection: resolves project-owned config files.
// Supports knowledge-agent.proj-self-repository-project: keeps root config as the default repository self project.
// Supports storage.postgres-deployment-configuration: parses deployment-supplied Postgres storage fields.
// Supports storage.env-gated-storage-locations: parses optional environment gates for storage locations.
// Harness-Requirement: storage.storage-location-knowledge
// Harness-Requirement: storage.actor-granted-location-access
// Harness-Requirement: knowledge-agent.project-config-selection
// Harness-Requirement: knowledge-agent.proj-self-repository-project

import { readFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";

export type MetaHarnessStorageCapability =
  | "read"
  | "write"
  | "delete"
  | "query"
  | "blob";

export type MetaHarnessStorageGrant = {
  actors?: string[];
  capabilities?: MetaHarnessStorageCapability[];
};

export type MetaHarnessStorageLocation = {
  name?: string;
  description?: string;
  driverName?: string;
  grants?: MetaHarnessStorageGrant[];
  libraryRootPath?: string;
  discoveryMode?: string;
  discoveryExcludes?: string[];
  discoverLibraries?: boolean;
  enabledWhenEnv?: string;
  connectionStringEnv?: string;
  schemaName?: string;
  tableName?: string;
  autoEnsureSchema?: boolean;
  sourceUri?: string;
  guidanceUri?: string;
};

export type MetaHarnessConfig = {
  project?: {
    name?: string;
    localRoot?: string;
  };
  storage?: {
    locations?: MetaHarnessStorageLocation[];
  };
};

/**
 * Reads a Meta Harness project metadata file.
 */
export function loadMetaHarnessConfig(
  repoRoot: string,
  configPath = ".meta-harness.json",
): MetaHarnessConfig {
  return JSON.parse(readFileSync(resolveProjectConfigPath(repoRoot, configPath), "utf8"));
}

/**
 * Resolves a project config path relative to the repository root.
 */
export function resolveProjectConfigPath(repoRoot: string, configPath: string): string {
  return isAbsolute(configPath) ? resolve(configPath) : resolve(repoRoot, configPath);
}

/**
 * Resolves the project root from the selected project config path.
 */
export function resolveProjectRootPath(repoRoot: string, configPath: string): string {
  return dirname(resolveProjectConfigPath(repoRoot, configPath));
}
