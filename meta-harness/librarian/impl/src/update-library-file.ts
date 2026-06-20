// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.update-through-librarian: implements Library updates through Librarian.
// Supports librarian.direct-storage-updates: writes directly through the storage backend.
// Supports librarian.resource-uri-tool-inputs: writes files by full Library resource URI.

import { dirname } from "node:path";
import { libraryResourceUri } from "./library-resource-uri.js";
import { publicLibraryListing } from "./public-library-listing.js";
import { resolveLibraryResource } from "./resolve-library-resource.js";
import { resolveLibraryFilePath } from "./resolve-library-file-path.js";
import type { LibrarianContext } from "./types.js";

/**
 * Writes one file into a writable Library through Librarian storage.
 */
export async function updateLibraryFile(
  context: LibrarianContext,
  input: { uri: string; content: string },
): Promise<Record<string, unknown>> {
  const { library, path } = await resolveLibraryResource(context, input.uri);
  if (!library.writable) {
    throw new Error(`${input.uri} is not writable by ${context.actorUri}`);
  }
  const filePath = resolveLibraryFilePath(library.rootPath, path);
  await context.storage.makeDirectory(dirname(filePath));
  await context.storage.writeText(filePath, input.content);
  return {
    library: publicLibraryListing(library),
    uri: libraryResourceUri(library.uri, path),
    bytesWritten: Buffer.byteLength(input.content, "utf8"),
  };
}
