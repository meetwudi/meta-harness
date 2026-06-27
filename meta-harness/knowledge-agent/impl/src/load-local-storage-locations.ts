// Generated file. Do not edit directly; update the Spec first.
// Supports storage.storage-location-knowledge: materializes storage locations from structured knowledge.
// Supports storage.project-scoped-storage-locations: loads storage locations from the selected project config.
// Supports knowledge-agent.local-filesystem-storage-compatibility: keeps filesystem storage as a supported local driver.
// Supports knowledge-agent.project-config-selection: uses the selected project config path.
// Supports storage.env-gated-storage-locations: skips optional storage locations until their deployment env var is present.
// Harness-Requirement: storage.actor-granted-location-access
// Harness-Requirement: storage.driver-capabilities
// Harness-Requirement: storage.postgres-deployment-configuration
// Harness-Requirement: storage.project-scoped-storage-locations
// Harness-Requirement: knowledge-agent.project-config-selection

import {
  createPostgresStorageFromConnectionString,
  type LibrarianStorage,
  type StorageDriverCapabilities,
  type StorageLocation,
} from "../../../librarian/impl/dist/index.js";
import {
  loadMetaHarnessConfig,
  resolveProjectRootPath,
  type MetaHarnessStorageCapability,
  type MetaHarnessStorageGrant,
  type MetaHarnessStorageLocation,
} from "./load-meta-harness-config.js";
import type { PreparedRuntime } from "./types.js";

type StorageLocationDefinition = MetaHarnessStorageLocation;

/**
 * Loads local Knowledge Agent storage locations from project marker knowledge.
 */
export function loadLocalStorageLocations(input: {
  repoRootPath: string;
  projectConfigPath: string;
  runtime: PreparedRuntime;
  storage: LibrarianStorage;
  actorUris: string[];
}): StorageLocation[] {
  const configPath = input.projectConfigPath;
  const data = loadMetaHarnessConfig(input.repoRootPath, configPath);
  const definitions = data.storage?.locations;
  if (!Array.isArray(definitions)) {
    throw new Error(`${configPath}: storage.locations must be an array`);
  }
  const values = {
    repoRootPath: input.repoRootPath,
    projectRootPath: resolveProjectRootPath(input.repoRootPath, configPath),
    localRoot: input.runtime.localRoot,
    tmpStorageLibrariesRoot: input.runtime.tmpStorageLibrariesRoot,
  };
  return definitions.flatMap((definition) => {
    const enabledWhenEnv = optionalString(definition, "enabledWhenEnv");
    if (enabledWhenEnv !== undefined && !process.env[enabledWhenEnv]) {
      return [];
    }
    return [materializeStorageLocation(definition, values, input.storage, input.actorUris)];
  });
}

function materializeStorageLocation(
  definition: StorageLocationDefinition,
  values: Record<string, string>,
  filesystemStorage: LibrarianStorage,
  actorUris: string[],
): StorageLocation {
  const driverName = requiredString(definition, "driverName");
  const storage = materializeStorageDriver(definition, driverName, filesystemStorage);
  return {
    name: requiredString(definition, "name"),
    description: requiredString(definition, "description"),
    driverName,
    storage,
    capabilities: computeGrantedCapabilities(requiredGrants(definition), actorUris),
    libraryRootPath: resolveToken(requiredString(definition, "libraryRootPath"), values),
    discoveryMode: requiredDiscoveryMode(definition, "discoveryMode"),
    discoveryExcludes: optionalStringArray(definition, "discoveryExcludes"),
    discoverLibraries: requiredBoolean(definition, "discoverLibraries"),
    defaultForLibraryCreation: optionalBoolean(definition, "defaultForLibraryCreation"),
    createdLibraryReadActors: optionalActorArray(definition, "createdLibraryReadActors"),
    createdLibraryUpdateActors: optionalActorArray(definition, "createdLibraryUpdateActors"),
    sourceUri: optionalString(definition, "sourceUri"),
    guidanceUri: optionalString(definition, "guidanceUri"),
  };
}

function materializeStorageDriver(
  definition: StorageLocationDefinition,
  driverName: string,
  filesystemStorage: LibrarianStorage,
): LibrarianStorage {
  if (driverName === "filesystem") {
    return filesystemStorage;
  }
  if (driverName === "postgres") {
    const envName = optionalString(definition, "connectionStringEnv") ??
      "META_HARNESS_POSTGRES_URL";
    const connectionString = process.env[envName];
    if (!connectionString) {
      throw new Error(`Postgres storage location requires environment variable: ${envName}`);
    }
    return createPostgresStorageFromConnectionString({
      connectionString,
      schemaName: optionalString(definition, "schemaName"),
      tableName: optionalString(definition, "tableName"),
      autoEnsureSchema: optionalBoolean(definition, "autoEnsureSchema"),
    });
  }
  throw new Error(`unsupported local storage driver: ${driverName}`);
}

function requiredString(definition: StorageLocationDefinition, key: string): string {
  const value = definition[key as keyof StorageLocationDefinition];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`storage location definition is missing string field: ${key}`);
  }
  return value;
}

function optionalString(
  definition: StorageLocationDefinition,
  key: string,
): string | undefined {
  const value = definition[key as keyof StorageLocationDefinition];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`storage location definition has invalid string field: ${key}`);
  }
  return value;
}

function optionalStringArray(
  definition: StorageLocationDefinition,
  key: string,
): string[] {
  const value = definition[key as keyof StorageLocationDefinition];
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`storage location definition has invalid string array field: ${key}`);
  }
  return value as string[];
}

function optionalActorArray(
  definition: StorageLocationDefinition,
  key: string,
): string[] | undefined {
  const value = definition[key as keyof StorageLocationDefinition];
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.startsWith("actor://"))) {
    throw new Error(`storage location definition has invalid actor array field: ${key}`);
  }
  return value as string[];
}

function requiredDiscoveryMode(
  definition: StorageLocationDefinition,
  key: string,
): StorageLocation["discoveryMode"] {
  const value = requiredString(definition, key);
  if (
    value !== "filesystem-root-and-direct-children" &&
    value !== "filesystem-recursive" &&
    value !== "resource-root-and-direct-children" &&
    value !== "resource-recursive"
  ) {
    throw new Error(`storage location definition has invalid discovery mode: ${value}`);
  }
  return value;
}

function optionalBoolean(
  definition: StorageLocationDefinition,
  key: string,
): boolean | undefined {
  const value = definition[key as keyof StorageLocationDefinition];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "boolean") {
    throw new Error(`storage location definition has invalid boolean field: ${key}`);
  }
  return value;
}

function requiredBoolean(definition: StorageLocationDefinition, key: string): boolean {
  const value = definition[key as keyof StorageLocationDefinition];
  if (typeof value !== "boolean") {
    throw new Error(`storage location definition is missing boolean field: ${key}`);
  }
  return value;
}

function requiredGrants(definition: StorageLocationDefinition): MetaHarnessStorageGrant[] {
  const grants = definition.grants;
  if (!Array.isArray(grants)) {
    throw new Error("storage location definition is missing grants array");
  }
  return grants;
}

function computeGrantedCapabilities(
  grants: MetaHarnessStorageGrant[],
  actorUris: string[],
): StorageDriverCapabilities {
  const granted = new Set<MetaHarnessStorageCapability>();
  for (const grant of grants) {
    const actors = requiredGrantStringArray(grant, "actors");
    const capabilities = requiredGrantCapabilities(grant);
    if (!actorUris.some((actorUri) => matchesAnyPattern(actors, actorUri))) {
      continue;
    }
    for (const capability of capabilities) {
      granted.add(capability);
    }
  }
  return {
    readable: granted.has("read"),
    writable: granted.has("write"),
    deletable: granted.has("delete"),
    queryable: granted.has("query"),
    blob: granted.has("blob"),
  };
}

function requiredGrantStringArray(
  grant: MetaHarnessStorageGrant,
  key: "actors",
): string[] {
  const value = grant[key];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) {
    throw new Error(`storage grant has invalid ${key} array`);
  }
  for (const actor of value) {
    if (!actor.startsWith("actor://")) {
      throw new Error(`storage grant actor must use actor://: ${actor}`);
    }
  }
  return value;
}

function requiredGrantCapabilities(
  grant: MetaHarnessStorageGrant,
): MetaHarnessStorageCapability[] {
  const value = grant.capabilities;
  if (!Array.isArray(value) || value.some((item) => !isStorageCapability(item))) {
    throw new Error("storage grant has invalid capabilities array");
  }
  return value;
}

function isStorageCapability(value: unknown): value is MetaHarnessStorageCapability {
  return (
    value === "read" ||
    value === "write" ||
    value === "delete" ||
    value === "query" ||
    value === "blob"
  );
}

function matchesAnyPattern(patterns: string[], value: string): boolean {
  return patterns.some((pattern) => wildcardPatternMatches(pattern, value));
}

function wildcardPatternMatches(pattern: string, value: string): boolean {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped.replace(/\*/g, ".*")}$`).test(value);
}

function resolveToken(value: string, values: Record<string, string>): string {
  return value.replace(/\{\{([A-Za-z0-9_]+)\}\}/g, (_, key: string) => {
    const replacement = values[key];
    if (replacement === undefined) {
      throw new Error(`unknown storage location token: ${key}`);
    }
    return replacement;
  });
}
