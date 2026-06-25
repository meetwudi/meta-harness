// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.storage-discovery-runtime: reads repository defaults from Meta Harness metadata.
// Harness-Requirement: storage.storage-location-knowledge
// Harness-Requirement: storage.actor-granted-location-access

import { readFileSync } from "node:fs";
import { join } from "node:path";

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
 * Reads the repository's Meta Harness metadata file.
 */
export function loadMetaHarnessConfig(repoRoot: string): MetaHarnessConfig {
  return JSON.parse(readFileSync(join(repoRoot, ".meta-harness.json"), "utf8"));
}
