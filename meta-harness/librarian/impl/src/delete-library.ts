// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.tool-librarian-delete-library: deletes governed Libraries through Librarian.
// Supports librarian.library-delete-governance: requires storage delete capability and Library update authority.

import { publicLibraryListing } from "./public-library-listing.js";
import { resolveLibraryLocation } from "./resolve-library-location.js";
import type { LibrarianContext } from "./types.js";

/**
 * Deletes an exact Library root when the active actor has delete authority.
 */
export async function deleteLibrary(
  context: LibrarianContext,
  input: { uri: string },
): Promise<Record<string, unknown>> {
  const { library, path } = await resolveLibraryLocation(context, input.uri);
  if (path) {
    throw new Error(`Library deletion requires an exact Library URI: ${input.uri}`);
  }
  if (!library.writable) {
    throw new Error(`${library.uri} is not writable by ${context.actorUri}`);
  }
  if (!library.deletable) {
    throw new Error(`${library.uri} is not deletable by ${context.actorUri}`);
  }

  await library.storage.deletePath(library.rootPath);
  return {
    uri: library.uri,
    storageLocationName: library.storageLocationName,
    deletedLibrary: publicLibraryListing(library),
  };
}
