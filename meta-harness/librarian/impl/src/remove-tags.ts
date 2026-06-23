// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.tool-librarian-remove-tags: implements `librarian_remove_tags`.
// Supports librarian.library-uri-verification: requires a verified actual Library scope URI.

import { isLibraryPathExcluded } from "./is-library-path-excluded.js";
import { libraryResourceUri } from "./library-resource-uri.js";
import { publicLibraryListing } from "./public-library-listing.js";
import { resolveLibraryLocation } from "./resolve-library-location.js";
import {
  normalizeTagValues,
  readTagsRecord,
  tagsRecordPath,
  writeTagsRecord,
} from "./tags-record.js";
import type { LibrarianContext } from "./types.js";

/**
 * Removes tag values from the TAGS.toml record for a writable Library knowledge scope.
 */
export async function removeTags(
  context: LibrarianContext,
  input: { scopeUri: string; tags: unknown },
): Promise<Record<string, unknown>> {
  const { library, path } = await resolveLibraryLocation(context, input.scopeUri);
  if (!library.writable) {
    throw new Error(`${input.scopeUri} is not writable by ${context.actorUri}`);
  }
  const recordPath = tagsRecordPath(path);
  if (path && isLibraryPathExcluded(path, library.agentExcludes)) {
    throw new Error(`${input.scopeUri} is excluded from agent access`);
  }
  if (isLibraryPathExcluded(recordPath, library.agentExcludes)) {
    throw new Error(`${libraryResourceUri(library.uri, recordPath)} is excluded from agent access`);
  }
  const tagsToRemove = normalizeTagValues(input.tags);
  const existing = await readTagsRecord(library, recordPath);
  const tags = existing.tags.filter((tag) => !tagsToRemove.includes(tag));
  const removedTags = existing.tags.filter((tag) => tagsToRemove.includes(tag));
  if (existing.exists) {
    await writeTagsRecord(library, recordPath, tags);
  }
  return {
    library: publicLibraryListing(library),
    scopeUri: libraryResourceUri(library.uri, path),
    tagsUri: libraryResourceUri(library.uri, recordPath),
    tags,
    removedTags,
  };
}
