// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.library-list-fields: creates Library URIs for listing results.

/**
 * Converts a Library index name into its Library URI.
 */
export function libraryUriFromName(name: string): string {
  return `library://${name}`;
}
