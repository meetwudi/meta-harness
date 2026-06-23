// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.resource-uri-tool-inputs: resolves Library URIs and resource URIs.
// Supports librarian.library-uri-verification: rejects malformed or unresolved exact Library URIs.

import { loadResolvedLibraries } from "./load-resolved-libraries.js";
import {
  verifyLibraryUriInput,
  verifyResolvedLibraryLocationUri,
} from "./library-uri-verification.js";
import type { LibrarianContext, ResolvedLibrary } from "./types.js";

export type LibraryLocation = {
  library: ResolvedLibrary;
  path: string;
};

/**
 * Resolves a Library URI or Library resource URI into its Library and internal relative path.
 */
export async function resolveLibraryLocation(
  context: LibrarianContext,
  uri: string,
): Promise<LibraryLocation> {
  const verifiedUri = verifyLibraryUriInput(uri);
  const libraries = await loadResolvedLibraries(context);
  const library = libraries
    .filter(
      (candidate) =>
        verifiedUri === candidate.uri ||
        verifiedUri.startsWith(`${candidate.uri}/`),
    )
    .sort((left, right) => right.uri.length - left.uri.length)[0];
  if (!library) {
    throw new Error(`Unknown Library URI: ${uri}`);
  }
  const path =
    verifiedUri === library.uri ? "" : verifiedUri.slice(library.uri.length + 1);
  verifyResolvedLibraryLocationUri(verifiedUri, library, path);
  return { library, path };
}
