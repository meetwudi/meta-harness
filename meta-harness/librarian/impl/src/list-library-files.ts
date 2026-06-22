// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.file-listing: lists file resource URIs under a Library URI.
// Supports librarian.agent-excludes: omits excluded Library paths from file listings.

import { join } from "node:path";
import { isLibraryPathExcluded } from "./is-library-path-excluded.js";
import { libraryResourceUri } from "./library-resource-uri.js";
import { publicLibraryListing } from "./public-library-listing.js";
import { resolveLibraryFilePath } from "./resolve-library-file-path.js";
import { resolveLibraryLocation } from "./resolve-library-location.js";
import type { LibrarianContext, LibrarianStorage } from "./types.js";
import { walkLibraryFiles } from "./walk-library-files.js";

/**
 * Lists file resource URIs under a readable Library URI or Library folder URI.
 */
export async function listLibraryFiles(
  context: LibrarianContext,
  input: { uri: string; recursive?: boolean },
): Promise<Record<string, unknown>> {
  const { library, path } = await resolveLibraryLocation(context, input.uri);
  if (!library.readable) {
    throw new Error(`${input.uri} is not readable by ${context.actorUri}`);
  }
  if (path && isLibraryPathExcluded(path, library.agentExcludes)) {
    throw new Error(`${input.uri} is excluded from agent access`);
  }

  const files = input.recursive
    ? await walkLibraryFiles(library.storage, library.rootPath, library.agentExcludes, path)
    : await listDirectFiles(library.storage, library.rootPath, library.agentExcludes, path);

  return {
    library: publicLibraryListing(library),
    uri: libraryResourceUri(library.uri, path),
    recursive: Boolean(input.recursive),
    files: files.map((file) => ({
      uri: libraryResourceUri(library.uri, file),
    })),
  };
}

/**
 * Lists direct file children below an internal Library-relative folder path.
 */
async function listDirectFiles(
  storage: LibrarianStorage,
  rootPath: string,
  excludes: string[],
  currentPath: string,
): Promise<string[]> {
  const absolutePath = resolveLibraryFilePath(rootPath, currentPath);
  const entries = await storage.listDirectory(absolutePath);
  return entries.flatMap((entry) => {
    if (entry.name.startsWith(".")) {
      return [];
    }
    const relativePath = currentPath ? join(currentPath, entry.name) : entry.name;
    if (entry.isDirectory || isLibraryPathExcluded(relativePath, excludes)) {
      return [];
    }
    return [relativePath];
  });
}
