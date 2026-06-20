// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.library-list-fields: returns the public Library listing fields.

import type { LibraryListing, ResolvedLibrary } from "./types.js";

/**
 * Converts a resolved Library into the public listing shape.
 */
export function publicLibraryListing(library: ResolvedLibrary): LibraryListing {
  return {
    name: library.name,
    uri: library.uri,
    description: library.description,
    readable: library.readable,
    writable: library.writable,
  };
}
