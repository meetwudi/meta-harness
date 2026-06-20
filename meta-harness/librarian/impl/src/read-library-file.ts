// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.shamanistic-library-tools: implements Library file retrieval for agents.
// Supports librarian.resource-uri-tool-inputs: reads files by full Library resource URI.
// Supports librarian.agent-excludes: blocks excluded Library paths during reads.

import { isLibraryPathExcluded } from "./is-library-path-excluded.js";
import { libraryResourceUri } from "./library-resource-uri.js";
import { publicLibraryListing } from "./public-library-listing.js";
import { resolveLibraryResource } from "./resolve-library-resource.js";
import { resolveLibraryFilePath } from "./resolve-library-file-path.js";
import type { LibrarianContext } from "./types.js";

/**
 * Reads one file from a readable Library.
 */
export async function readLibraryFile(
  context: LibrarianContext,
  input: { uri: string },
): Promise<Record<string, unknown>> {
  const { library, path } = await resolveLibraryResource(context, input.uri);
  if (!library.readable) {
    throw new Error(`${input.uri} is not readable by ${context.actorUri}`);
  }
  if (isLibraryPathExcluded(path, library.agentExcludes)) {
    throw new Error(`${path} is excluded from agent access`);
  }
  const filePath = resolveLibraryFilePath(library.rootPath, path);
  return {
    library: publicLibraryListing(library),
    uri: libraryResourceUri(library.uri, path),
    content: await context.storage.readText(filePath),
  };
}
