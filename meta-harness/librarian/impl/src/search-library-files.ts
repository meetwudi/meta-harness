// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.shamanistic-library-tools: implements Library file discovery for retrieval.
// Supports librarian.multi-library-search: searches across Libraries selected by URI pattern.
// Supports librarian.agent-excludes: skips excluded Library paths during searches.
// Supports librarian.library-uri-verification: verifies exact Library URI search patterns.
// Supports librarian.postgres-backed-library-interface: searches Postgres-backed Library resources.
// Supports librarian.search-library-pattern-order: searches Libraries in requested URI pattern order.

import { contentSnippet } from "./content-snippet.js";
import { libraryResourceUri } from "./library-resource-uri.js";
import { loadResolvedLibraries } from "./load-resolved-libraries.js";
import { matchesAnyPattern } from "./matches-any-pattern.js";
import { publicLibraryListing } from "./public-library-listing.js";
import { resolveLibraryFilePath } from "./resolve-library-file-path.js";
import type { LibrarianContext } from "./types.js";
import { verifyLibraryUriPatterns } from "./library-uri-verification.js";
import { walkLibraryFiles } from "./walk-library-files.js";

/**
 * Searches readable Library files by resource URI or file content.
 */
export async function searchLibraryFiles(
  context: LibrarianContext,
  input: { libraryUriPatterns: string[]; query: string; limit?: number },
): Promise<Record<string, unknown>> {
  if (input.libraryUriPatterns.length === 0) {
    throw new Error("Search requires at least one Library URI pattern");
  }
  const query = input.query.trim().toLowerCase();
  if (query.length < 2) {
    throw new Error("Search query must be at least two characters");
  }
  const limit = Math.max(1, Math.min(input.limit ?? 10, 25));
  const allLibraries = await loadResolvedLibraries(context);
  verifyLibraryUriPatterns(input.libraryUriPatterns, allLibraries);
  const libraries = allLibraries
    .filter(
      (library) =>
        library.readable &&
        matchesAnyPattern(input.libraryUriPatterns, library.uri),
    )
    .map((library) => ({
      library,
      order: matchingPatternIndex(input.libraryUriPatterns, library.uri),
    }))
    .sort((left, right) => left.order - right.order)
    .map((entry) => entry.library);
  const results: Record<string, unknown>[] = [];
  let matchCount = 0;
  for (const library of libraries) {
    const matches: Record<string, unknown>[] = [];
    for (const path of await walkLibraryFiles(library.storage, library.rootPath, library.agentExcludes)) {
      if (matchCount >= limit) {
        break;
      }
      const absolutePath = resolveLibraryFilePath(library.rootPath, path);
      let content = "";
      try {
        content = await library.storage.readText(absolutePath);
      } catch {
        continue;
      }
      if (path.toLowerCase().includes(query) || content.toLowerCase().includes(query)) {
        matches.push({
          uri: libraryResourceUri(library.uri, path),
          content: contentSnippet(content, query),
        });
        matchCount += 1;
      }
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
    libraryUriPatterns: input.libraryUriPatterns,
    query: input.query,
    results,
  };
}

function matchingPatternIndex(patterns: string[], libraryUri: string): number {
  const index = patterns.findIndex((pattern) => matchesAnyPattern([pattern], libraryUri));
  return index >= 0 ? index : Number.MAX_SAFE_INTEGER;
}
