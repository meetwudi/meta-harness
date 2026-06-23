// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.library-list-fields: creates Library URIs for listing results.
// Supports librarian.library-name-format: refuses non-canonical Library names.

import { validateLibraryName } from "./library-name.js";

/**
 * Converts a Library name into its Library URI.
 */
export function libraryUriFromName(name: string): string {
  return `library://${validateLibraryName(name)}`;
}
