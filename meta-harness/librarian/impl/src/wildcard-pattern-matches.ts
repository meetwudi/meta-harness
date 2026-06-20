// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.readable-writable-computed: evaluates governance wildcard patterns.

/**
 * Returns whether a simple `*` wildcard pattern matches a value.
 */
export function wildcardPatternMatches(pattern: string, value: string): boolean {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`^${escaped.replace(/\*/g, ".*")}$`);
  return regex.test(value);
}
