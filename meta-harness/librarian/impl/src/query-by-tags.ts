// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.query-by-tags: implements structured query by independent Tags records.
// Supports librarian.tool-librarian-query-by-tags: implements `librarian_query_by_tags`.
// Supports librarian.library-uri-verification: verifies exact Library URI query patterns.

import { isLibraryPathExcluded } from "./is-library-path-excluded.js";
import { libraryResourceUri } from "./library-resource-uri.js";
import { loadResolvedLibraries } from "./load-resolved-libraries.js";
import { matchesAnyPattern } from "./matches-any-pattern.js";
import { publicLibraryListing } from "./public-library-listing.js";
import {
  verifyLibraryUriPatterns,
  verifyLibraryUris,
} from "./library-uri-verification.js";
import { normalizeTagValues, readTagsRecord } from "./tags-record.js";
import type { LibrarianContext } from "./types.js";
import { walkLibraryFiles } from "./walk-library-files.js";

export type QueryByTagsInput = {
  libraryUris?: string[];
  libraryUriPatterns?: string[];
  tags: unknown;
  match?: "all" | "any";
  limit?: number;
};

/**
 * Queries readable Library knowledge scopes by TAGS.toml tag values.
 */
export async function queryByTags(
  context: LibrarianContext,
  input: QueryByTagsInput,
): Promise<Record<string, unknown>> {
  const tags = normalizeTagValues(input.tags);
  const match = input.match === "any" ? "any" : "all";
  const limit = Math.max(1, Math.min(input.limit ?? 25, 100));
  const allLibraries = await loadResolvedLibraries(context);
  const libraryUris = input.libraryUris ?? [];
  const libraryUriPatterns = input.libraryUriPatterns ?? [];
  if (libraryUris.length > 0) {
    verifyLibraryUris(libraryUris, allLibraries);
  }
  if (libraryUriPatterns.length > 0) {
    verifyLibraryUriPatterns(libraryUriPatterns, allLibraries);
  }
  const libraries = allLibraries.filter((library) => {
    if (!library.readable) {
      return false;
    }
    if (libraryUris.length === 0 && libraryUriPatterns.length === 0) {
      return true;
    }
    return libraryUris.includes(library.uri) ||
      (libraryUriPatterns.length > 0 && matchesAnyPattern(libraryUriPatterns, library.uri));
  });
  const results: Record<string, unknown>[] = [];
  let matchCount = 0;
  for (const library of libraries) {
    const matches: Record<string, unknown>[] = [];
    for (const recordPath of await walkLibraryFiles(library.storage, library.rootPath, library.agentExcludes)) {
      if (matchCount >= limit) {
        break;
      }
      const isTagsRecord = recordPath === "TAGS.toml" || recordPath.endsWith("/TAGS.toml");
      if (!isTagsRecord || isLibraryPathExcluded(recordPath, library.agentExcludes)) {
        continue;
      }
      const record = await readTagsRecord(library, recordPath);
      const matchedTags = tags.filter((tag) => record.tags.includes(tag));
      const isMatch = match === "all"
        ? matchedTags.length === tags.length
        : matchedTags.length > 0;
      if (!isMatch) {
        continue;
      }
      const scopePath = recordPath === "TAGS.toml"
        ? ""
        : recordPath.slice(0, -"TAGS.toml".length).replace(/\/$/, "");
      matches.push({
        scopeUri: libraryResourceUri(library.uri, scopePath),
        tagsUri: libraryResourceUri(library.uri, recordPath),
        tags: record.tags,
        matchedTags,
      });
      matchCount += 1;
    }
    if (matches.length > 0) {
      results.push({
        library: publicLibraryListing(library),
        matches,
      });
    }
    if (matchCount >= limit) {
      break;
    }
  }
  return {
    libraryUris,
    libraryUriPatterns,
    tags,
    match,
    results,
  };
}
