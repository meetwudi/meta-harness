// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.storage-discovery-runtime: reads repository defaults from Meta Harness metadata.
// Supports knowledge-agent.project-config-selection: resolves project-owned config files.
// Supports knowledge-agent.proj-self-repository-project: keeps root config as the default repository self project.
// Supports knowledge-agent.postgres-runtime-storage: parses configured runtime conversation storage.
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
  defaultForLibraryCreation?: boolean;
  createdLibraryReadActors?: string[];
  createdLibraryUpdateActors?: string[];
  enabledWhenEnv?: string;
  connectionStringEnv?: string;
  schemaName?: string;
  tableName?: string;
  autoEnsureSchema?: boolean;
  sourceUri?: string;
  guidanceUri?: string;
};

export type MetaHarnessRuntimeStorage = {
  driverName?: string;
  connectionStringEnv?: string;
  schemaName?: string;
  tableName?: string;
  autoEnsureSchema?: boolean;
};

export type MetaHarnessRuntimeLibrary = {
  name?: string;
  rootPath?: string;
};

export type MetaHarnessConfig = {
  project?: {
    name?: string;
    localRoot?: string;
    actorUri?: string;
  };
  libraryCreation?: {
    policyUri?: string;
  };
  storage?: {
    locations?: MetaHarnessStorageLocation[];
  };
  runtime?: {
    conversationStorage?: MetaHarnessRuntimeStorage;
    conversationLibrary?: MetaHarnessRuntimeLibrary;
    memoryCurator?: {
      enabled?: boolean;
      actorUri?: string;
      recentMessageLimit?: number;
      latestUserMessageOnly?: boolean;
    };
    sharedMemory?: {
      enabled?: boolean;
      library?: MetaHarnessRuntimeLibrary;
    };
  };
};

export type ResolvedRuntimeLibraryConfig = {
  name: string;
  rootPath: string;
};

export type ResolvedMemoryCuratorConfig = {
  enabled: boolean;
  actorUri?: string;
  recentMessageLimit?: number;
  latestUserMessageOnly?: boolean;
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

/**
 * Resolves the active Knowledge Agent actor from project configuration.
 */
export function resolveProjectActorUri(config?: MetaHarnessConfig): string {
  const actorUri = config?.project?.actorUri;
  if (typeof actorUri !== "string" || !actorUri.startsWith("actor://")) {
    throw new Error(".meta-harness.json project.actorUri must use actor://");
  }
  return actorUri;
}

/**
 * Resolves whether the selected project explicitly enabled shared memory.
 */
export function sharedMemoryEnabled(config?: MetaHarnessConfig): boolean {
  return config?.runtime?.sharedMemory?.enabled === true;
}

/**
 * Resolves one required runtime Library declaration from project configuration.
 */
export function resolveRuntimeLibraryConfig(
  value: MetaHarnessRuntimeLibrary | undefined,
  label: string,
): ResolvedRuntimeLibraryConfig {
  if (!value || typeof value !== "object") {
    throw new Error(`.meta-harness.json ${label} is required`);
  }
  if (typeof value.name !== "string" || !libraryNamePattern.test(value.name)) {
    throw new Error(`.meta-harness.json ${label}.name must use ${libraryNameFormat}`);
  }
  if (typeof value.rootPath !== "string" || !value.rootPath.trim()) {
    throw new Error(`.meta-harness.json ${label}.rootPath must be a non-empty string`);
  }
  return {
    name: value.name,
    rootPath: value.rootPath,
  };
}

/**
 * Resolves the optional shared Memory Library declaration from project config.
 */
export function resolveSharedMemoryRuntimeConfig(
  config?: MetaHarnessConfig,
): { enabled: boolean; library?: ResolvedRuntimeLibraryConfig } {
  const enabled = sharedMemoryEnabled(config);
  if (!enabled) {
    return { enabled };
  }
  return {
    enabled,
    library: resolveRuntimeLibraryConfig(
      config?.runtime?.sharedMemory?.library,
      "runtime.sharedMemory.library",
    ),
  };
}

/**
 * Resolves the optional Library-scoped memory curator runtime config.
 */
export function resolveMemoryCuratorConfig(
  config?: MetaHarnessConfig,
): ResolvedMemoryCuratorConfig {
  const value = config?.runtime?.memoryCurator;
  if (value?.enabled !== true) {
    return { enabled: false };
  }
  if (typeof value.actorUri !== "string" || !value.actorUri.startsWith("actor://")) {
    throw new Error(".meta-harness.json runtime.memoryCurator.actorUri must use actor://");
  }
  if (!Number.isInteger(value.recentMessageLimit) || (value.recentMessageLimit ?? 0) < 1) {
    throw new Error(".meta-harness.json runtime.memoryCurator.recentMessageLimit must be a positive integer");
  }
  if (value.latestUserMessageOnly !== true) {
    throw new Error(".meta-harness.json runtime.memoryCurator.latestUserMessageOnly must be true");
  }
  return {
    enabled: true,
    actorUri: value.actorUri,
    recentMessageLimit: value.recentMessageLimit,
    latestUserMessageOnly: true,
  };
}

const libraryNamePattern = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;
const libraryNameFormat = "lowercase letters and digits separated by hyphens or underscores";
