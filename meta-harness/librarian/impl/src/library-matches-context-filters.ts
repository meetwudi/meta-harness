// Generated file. Do not edit directly; update the Spec first.
// Harness-Requirement: librarian.context-filters
// Harness-Requirement: librarian.actor-context-filters

import { matchesAnyPattern } from "./matches-any-pattern.js";
import { stringArray } from "./string-array.js";
import type { LibrarianContext, TomlRecord } from "./types.js";

/**
 * Returns whether a Library manifest matches the active Librarian context filters.
 */
export function libraryMatchesContextFilters(
  context: LibrarianContext,
  manifest: TomlRecord,
): boolean {
  const actorUriFilters = context.contextFilters.actorUris;
  if (actorUriFilters.length === 0) {
    return true;
  }
  const governancePatterns = [
    ...stringArray(manifest.read_actors),
    ...stringArray(manifest.update_actors),
  ];
  return actorUriFilters.some((actorUri) =>
    matchesAnyPattern(governancePatterns, actorUri)
  );
}
