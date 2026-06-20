// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.readable-writable-computed: computes access from governance and actor identity.

import { matchesAnyPattern } from "./matches-any-pattern.js";
import { stringArray } from "./string-array.js";
import type { TomlRecord } from "./types.js";

/**
 * Computes readable and writable booleans from Library governance and actor identity.
 */
export function computeLibraryAccess(
  manifest: TomlRecord,
  actorUri: string,
): { readable: boolean; writable: boolean } {
  const readActors = [
    ...stringArray(manifest.read_actors),
    ...stringArray(manifest.read_tasks),
  ];
  const updateActors = [
    ...stringArray(manifest.update_actors),
    ...stringArray(manifest.update_tasks),
  ];
  return {
    readable: matchesAnyPattern(readActors, actorUri),
    writable: matchesAnyPattern(updateActors, actorUri),
  };
}
