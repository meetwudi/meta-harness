// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.library-list-fields: resolves discovered Libraries into listed Libraries.
// Supports librarian.readable-writable-computed: attaches computed access to each Library.
// Supports storage.all-known-storage-locations: associates resolved Libraries with storage locations.
// Supports librarian.storage-discovery-tool-context: discovers Libraries from storage locations.
// Harness-Requirement: storage.actor-granted-location-access
// Harness-Requirement: librarian.context-filters
// Harness-Requirement: librarian.actor-context-filters

import { join, relative, sep } from "node:path";
import { computeLibraryAccess } from "./compute-library-access.js";
import { libraryMatchesContextFilters } from "./library-matches-context-filters.js";
import { validateLibraryName } from "./library-name.js";
import { libraryUriFromName } from "./library-uri-from-name.js";
import { readTomlFile } from "./read-toml-file.js";
import { stringArray } from "./string-array.js";
import { wildcardPatternMatches } from "./wildcard-pattern-matches.js";
import type {
  LibrarianContext,
  LibrarianStorage,
  ResolvedLibrary,
  StorageLocation,
} from "./types.js";

/**
 * Resolves all Libraries discoverable from the context storage locations.
 */
export async function loadResolvedLibraries(
  context: LibrarianContext,
): Promise<ResolvedLibrary[]> {
  const libraries = new Map<string, ResolvedLibrary>();
  for (const location of context.storageLocations) {
    if (
      location.discoverLibraries === false ||
      !location.capabilities.readable ||
      !location.capabilities.queryable
    ) {
      continue;
    }
    await loadDiscoveredLibraries(
      libraries,
      location,
      await discoverLibraryRoots(location.storage, location.libraryRootPath, location),
      context,
    );
  }
  return [...libraries.values()];
}

async function loadDiscoveredLibraries(
  libraries: Map<string, ResolvedLibrary>,
  location: StorageLocation,
  roots: string[],
  context: LibrarianContext,
): Promise<void> {
  for (const rootPath of roots) {
    const manifestPath = join(rootPath, "LIBRARY.toml");
    const manifest = await readTomlFile(location.storage, manifestPath);
    if (!libraryMatchesContextFilters(context, manifest)) {
      continue;
    }
    const access = computeLibraryAccess(manifest, context.actorUris);
    if (typeof manifest.name !== "string" || !manifest.name.trim()) {
      throw new Error(`${manifestPath}: name must be a non-empty string`);
    }
    const name = validateLibraryName(manifest.name, `${manifestPath}: name`);
    const uri = libraryUriFromName(name);
    libraries.set(uri, {
      name,
      uri,
      description: typeof manifest.description === "string" ? manifest.description : "",
      isSystemLibrary: manifest.isSystemLibrary === true,
      readable: access.readable,
      writable: access.writable,
      deletable: access.writable && location.capabilities.deletable,
      rootPath,
      agentExcludes: stringArray(manifest.agent_excludes),
      storage: location.storage,
      storageLocationName: location.name,
      storageLocationRootPath: location.libraryRootPath,
      storageDriverName: location.driverName,
    });
  }
}

async function discoverLibraryRoots(
  storage: LibrarianStorage,
  rootPath: string,
  location: { discoveryMode: StorageLocation["discoveryMode"]; discoveryExcludes: string[] },
): Promise<string[]> {
  if (!(await storage.exists(rootPath))) {
    return [];
  }
  if (
    location.discoveryMode === "filesystem-root-and-direct-children" ||
    location.discoveryMode === "resource-root-and-direct-children"
  ) {
    return discoverRootAndDirectChildren(storage, rootPath, location.discoveryExcludes);
  }
  return discoverRecursive(storage, rootPath, location.discoveryExcludes);
}

async function discoverRootAndDirectChildren(
  storage: LibrarianStorage,
  rootPath: string,
  excludes: string[],
): Promise<string[]> {
  const roots: string[] = [];
  if (await storage.exists(join(rootPath, "LIBRARY.toml"))) {
    roots.push(rootPath);
  }
  for (const entry of await storage.listDirectory(rootPath)) {
    if (!entry.isDirectory || entry.name.startsWith(".")) {
      continue;
    }
    const childRoot = join(rootPath, entry.name);
    if (isDiscoveryExcluded(rootPath, childRoot, excludes)) {
      continue;
    }
    if (await storage.exists(join(childRoot, "LIBRARY.toml"))) {
      roots.push(childRoot);
    }
  }
  return roots;
}

async function discoverRecursive(
  storage: LibrarianStorage,
  rootPath: string,
  excludes: string[],
): Promise<string[]> {
  const roots: string[] = [];
  await walkDiscoveryRoot(storage, rootPath, rootPath, excludes, roots);
  return roots;
}

async function walkDiscoveryRoot(
  storage: LibrarianStorage,
  rootPath: string,
  currentPath: string,
  excludes: string[],
  roots: string[],
): Promise<void> {
  if (isDiscoveryExcluded(rootPath, currentPath, excludes)) {
    return;
  }
  if (await storage.exists(join(currentPath, "LIBRARY.toml"))) {
    roots.push(currentPath);
    if (currentPath !== rootPath) {
      return;
    }
  }
  for (const entry of await storage.listDirectory(currentPath)) {
    if (!entry.isDirectory || entry.name.startsWith(".")) {
      continue;
    }
    await walkDiscoveryRoot(storage, rootPath, join(currentPath, entry.name), excludes, roots);
  }
}

function isDiscoveryExcluded(rootPath: string, path: string, patterns: string[]): boolean {
  const relativePath = relative(rootPath, path).split(sep).join("/");
  if (!relativePath) {
    return false;
  }
  return patterns.some((pattern) => wildcardPatternMatches(pattern, relativePath));
}
