// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.shamanistic-library-tools: implements Library listing for agents.
// Supports librarian.library-list-fields: returns Libraries with name, URI, description, access fields, and system metadata.
// Supports librarian.library-list-controllable-first: lists non-system Libraries before system Libraries.
// Supports librarian.postgres-backed-library-interface: lists Postgres-backed Libraries through Librarian.

import { loadResolvedLibraries } from "./load-resolved-libraries.js";
import { publicLibraryListing } from "./public-library-listing.js";
import type { LibrarianContext, LibraryListResult } from "./types.js";

/**
 * Lists Libraries available to the current Librarian context.
 */
export async function listLibraries(
  context: LibrarianContext,
): Promise<LibraryListResult> {
  const libraries = await loadResolvedLibraries(context);
  return {
    libraries: libraries
      .map(publicLibraryListing)
      .sort(compareLibraryListings),
  };
}

function compareLibraryListings(
  left: ReturnType<typeof publicLibraryListing>,
  right: ReturnType<typeof publicLibraryListing>,
): number {
  if (left.isSystemLibrary !== right.isSystemLibrary) {
    return left.isSystemLibrary ? 1 : -1;
  }
  const leftControl = controlRank(left);
  const rightControl = controlRank(right);
  if (leftControl !== rightControl) {
    return rightControl - leftControl;
  }
  return left.uri.localeCompare(right.uri);
}

function controlRank(library: ReturnType<typeof publicLibraryListing>): number {
  if (library.deletable) {
    return 2;
  }
  if (library.writable) {
    return 1;
  }
  return 0;
}
