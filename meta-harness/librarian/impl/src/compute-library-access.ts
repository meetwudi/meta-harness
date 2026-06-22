// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.readable-writable-computed: computes access from governance and actor identity.

import { matchesAnyPattern } from "./matches-any-pattern.js";
import { stringArray } from "./string-array.js";
import type { TomlRecord } from "./types.js";

/**
 * Computes readable and writable booleans from Library governance and active actor identities.
 */
export function computeLibraryAccess(
  manifest: TomlRecord,
  actorUris: string[],
): { readable: boolean; writable: boolean } {
  const readActors = stringArray(manifest.read_actors);
  const updateActors = stringArray(manifest.update_actors);
  return {
    readable: matchesAnyActor(readActors, actorUris),
    writable: matchesAnyActor(updateActors, actorUris),
  };
}

function matchesAnyActor(patterns: string[], actorUris: string[]): boolean {
  return actorUris.some((actorUri) => matchesAnyPattern(patterns, actorUri));
}
