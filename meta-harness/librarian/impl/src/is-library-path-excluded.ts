// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.agent-excludes: applies Library agent_excludes during Librarian access.

import { wildcardPatternMatches } from "./wildcard-pattern-matches.js";

/**
 * Returns whether a Library-relative path is excluded from agent access.
 */
export function isLibraryPathExcluded(relativePath: string, patterns: string[]): boolean {
  const normalized = relativePath.replace(/\\/g, "/");
  return patterns.some((pattern) => wildcardPatternMatches(pattern, normalized));
}
