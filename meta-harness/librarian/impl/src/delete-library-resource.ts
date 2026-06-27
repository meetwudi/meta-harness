// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.tool-librarian-delete: deletes governed file and folder resources through Librarian.

import { libraryResourceUri } from "./library-resource-uri.js";
import { publicLibraryListing } from "./public-library-listing.js";
import { resolveLibraryFilePath } from "./resolve-library-file-path.js";
import { resolveLibraryResource } from "./resolve-library-resource.js";
import type { LibrarianContext } from "./types.js";

/**
 * Deletes one file or folder resource from a writable and deletable Library.
 */
export async function deleteLibraryResource(
  context: LibrarianContext,
  input: { uri: string },
): Promise<Record<string, unknown>> {
  const { library, path } = await resolveLibraryResource(context, input.uri);
  if (!library.writable) {
    throw new Error(`${input.uri} is not writable by ${context.actorUri}`);
  }
  if (!library.deletable) {
    throw new Error(`${library.uri} is not deletable by ${context.actorUri}`);
  }

  const filePath = resolveLibraryFilePath(library.rootPath, path);
  if (!(await library.storage.exists(filePath))) {
    throw new Error(`${input.uri} does not exist`);
  }
  await library.storage.deletePath(filePath);
  return {
    library: publicLibraryListing(library),
    uri: libraryResourceUri(library.uri, path),
    storageLocationName: library.storageLocationName,
    deleted: true,
  };
}
