// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.shamanistic-library-tools: implements Library listing for agents.
// Supports librarian.library-list-fields: returns Libraries with name, URI, description, readable, and writable.
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
    libraries: libraries.map(publicLibraryListing),
  };
}
