// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.resource-uri-tool-inputs: resolves full Library resource URIs.

import { resolveLibraryLocation } from "./resolve-library-location.js";
import type { LibrarianContext, ResolvedLibrary } from "./types.js";

export type LibraryResource = {
  library: ResolvedLibrary;
  path: string;
};

/**
 * Resolves a full Library resource URI into its Library and Library-relative path.
 */
export async function resolveLibraryResource(
  context: LibrarianContext,
  uri: string,
): Promise<LibraryResource> {
  const { library, path } = await resolveLibraryLocation(context, uri);
  if (!path) {
    throw new Error(`Library resource URI must include a file path: ${uri}`);
  }
  return { library, path };
}
