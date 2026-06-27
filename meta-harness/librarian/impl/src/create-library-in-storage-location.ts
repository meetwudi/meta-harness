// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.create-library-in-storage-location: creates a Library in a named storage location.
// Supports storage.library-creation-target-location: targets creation at a storage location.
// Supports storage.location-library-placement: uses the storage location's Library root for placement.
// Supports librarian.postgres-backed-library-interface: creates Libraries through storage abstraction.

import { join } from "node:path";
import { validateLibraryName } from "./library-name.js";
import { libraryUriFromName } from "./library-uri-from-name.js";
import { loadResolvedLibraries } from "./load-resolved-libraries.js";
import { publicLibraryListing } from "./public-library-listing.js";
import type { LibrarianContext, StorageLocation } from "./types.js";

export type CreateLibraryInStorageLocationInput = {
  storageLocationName?: string;
  name: string;
  description: string;
};

/**
 * Creates a Library inside a named storage location.
 */
export async function createLibraryInStorageLocation(
  context: LibrarianContext,
  input: CreateLibraryInStorageLocationInput,
): Promise<Record<string, unknown>> {
  const name = validateLibraryName(input.name);
  const description = requiredDescription(input.description);
  const location = findCreationStorageLocation(context, input.storageLocationName);
  if (!location.capabilities.writable) {
    throw new Error(`Storage location cannot create Libraries: ${location.name}`);
  }
  if ((await loadResolvedLibraries(context)).some((library) => library.uri === libraryUriFromName(name))) {
    throw new Error(`Library already exists: ${libraryUriFromName(name)}`);
  }

  const libraryRoot = join(location.libraryRootPath, name);
  const libraryToml = join(libraryRoot, "LIBRARY.toml");
  if (await location.storage.exists(libraryToml)) {
    throw new Error(`Library definition already exists: ${libraryUriFromName(name)}`);
  }

  await location.storage.makeDirectory(libraryRoot);
  await location.storage.writeText(
    libraryToml,
    renderLibraryToml(name, description, location, context.actorUri),
  );

  const created = (await loadResolvedLibraries(context)).find(
    (library) => library.uri === libraryUriFromName(name),
  );
  if (!created) {
    throw new Error(`Created Library did not resolve: ${libraryUriFromName(name)}`);
  }
  return {
    storageLocation: {
      name: location.name,
      description: location.description,
      driverName: location.driverName,
    },
    library: publicLibraryListing(created),
  };
}

function findCreationStorageLocation(
  context: LibrarianContext,
  name: string | undefined,
): StorageLocation {
  if (name === undefined) {
    return defaultCreationStorageLocation(context);
  }
  const location = context.storageLocations.find((candidate) => candidate.name === name);
  if (!location) {
    throw new Error(`Unknown storage location: ${name}`);
  }
  return location;
}

function defaultCreationStorageLocation(context: LibrarianContext): StorageLocation {
  const locations = context.storageLocations.filter(
    (candidate) => candidate.defaultForLibraryCreation === true,
  );
  if (locations.length === 0) {
    throw new Error("Library creation requires storageLocationName because no default creation storage location is configured");
  }
  if (locations.length > 1) {
    throw new Error("Library creation has multiple default creation storage locations configured");
  }
  return locations[0] as StorageLocation;
}

function requiredDescription(description: string): string {
  const trimmed = description.trim();
  if (!trimmed) {
    throw new Error("Library creation requires a non-empty description");
  }
  return trimmed;
}

function renderLibraryToml(
  name: string,
  description: string,
  location: StorageLocation,
  actorUri: string,
): string {
  const readActors = location.createdLibraryReadActors ?? [actorUri];
  const updateActors = location.createdLibraryUpdateActors ?? [actorUri];
  const lines = [
    "# This is a Harness primitive.",
    "# See also: library://meta-harness",
    "",
    `name = ${JSON.stringify(name)}`,
    "isSystemLibrary = false",
    `description = ${JSON.stringify(description)}`,
  ];
  lines.push(
    `read_actors = ${JSON.stringify(readActors)}`,
    `update_actors = ${JSON.stringify(updateActors)}`,
    "",
  );
  return lines.join("\n");
}
