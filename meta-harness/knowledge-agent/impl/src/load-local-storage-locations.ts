// Generated file. Do not edit directly; update the Spec first.
// Supports storage.storage-location-knowledge: materializes storage locations from structured knowledge.

import {
  parseToml,
  type LibrarianStorage,
  type StorageLocation,
} from "../../../librarian/impl/dist/index.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PreparedRuntime } from "./types.js";

type StorageLocationDefinition = Record<string, unknown>;

const storageDefinitionsPath = "storage/knowledge-agent-local-storage-locations.toml";

/**
 * Loads local Knowledge Agent storage locations from structured storage knowledge.
 */
export function loadLocalStorageLocations(input: {
  repoRootPath: string;
  runtime: PreparedRuntime;
  storage: LibrarianStorage;
}): StorageLocation[] {
  const definitionsPath = join(input.repoRootPath, "meta-harness", storageDefinitionsPath);
  const data = parseToml(readFileSync(definitionsPath, "utf8"));
  const definitions = data.storage_locations;
  if (!Array.isArray(definitions)) {
    throw new Error(`${definitionsPath}: storage_locations must be an array of tables`);
  }
  const values = {
    repoRootPath: input.repoRootPath,
    localRoot: input.runtime.localRoot,
    tmpStorageLibrariesRoot: input.runtime.tmpStorageLibrariesRoot,
  };
  return definitions.map((definition) =>
    materializeStorageLocation(definition as StorageLocationDefinition, values, input.storage),
  );
}

function materializeStorageLocation(
  definition: StorageLocationDefinition,
  values: Record<string, string>,
  storage: LibrarianStorage,
): StorageLocation {
  return {
    name: requiredString(definition, "name"),
    description: requiredString(definition, "description"),
    driverName: requiredString(definition, "driver_name"),
    storage,
    capabilities: {
      readable: requiredBoolean(definition, "readable"),
      writable: requiredBoolean(definition, "writable"),
      deletable: requiredBoolean(definition, "deletable"),
      queryable: requiredBoolean(definition, "queryable"),
    },
    libraryRootPath: resolveToken(requiredString(definition, "library_root_path"), values),
    discoveryMode: requiredDiscoveryMode(definition, "discovery_mode"),
    discoveryExcludes: optionalStringArray(definition, "discovery_excludes"),
    discoverLibraries: requiredBoolean(definition, "discover_libraries"),
    sourceUri: optionalString(definition, "source_uri"),
    guidanceUri: optionalString(definition, "guidance_uri"),
  };
}

function requiredString(definition: StorageLocationDefinition, key: string): string {
  const value = definition[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`storage location definition is missing string field: ${key}`);
  }
  return value;
}

function optionalString(
  definition: StorageLocationDefinition,
  key: string,
): string | undefined {
  const value = definition[key];
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
  const value = definition[key];
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`storage location definition has invalid string array field: ${key}`);
  }
  return value;
}

function requiredDiscoveryMode(
  definition: StorageLocationDefinition,
  key: string,
): StorageLocation["discoveryMode"] {
  const value = requiredString(definition, key);
  if (
    value !== "filesystem-root-and-direct-children" &&
    value !== "filesystem-recursive"
  ) {
    throw new Error(`storage location definition has invalid discovery mode: ${value}`);
  }
  return value;
}

function requiredBoolean(definition: StorageLocationDefinition, key: string): boolean {
  const value = definition[key];
  if (typeof value !== "boolean") {
    throw new Error(`storage location definition is missing boolean field: ${key}`);
  }
  return value;
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
