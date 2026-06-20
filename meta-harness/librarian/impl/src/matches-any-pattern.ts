// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.readable-writable-computed: evaluates actor identity against governance patterns.

import { wildcardPatternMatches } from "./wildcard-pattern-matches.js";

/**
 * Returns whether any pattern matches the provided value.
 */
export function matchesAnyPattern(patterns: string[], value: string): boolean {
  return patterns.some((pattern) => wildcardPatternMatches(pattern, value));
}
