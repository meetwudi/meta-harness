// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.readable-writable-computed: normalizes governance pattern arrays.

/**
 * Returns a string array only when the value is an array of strings.
 */
export function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}
