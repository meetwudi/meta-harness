// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.resource-uri-tool-inputs: builds full Library resource URIs.

/**
 * Builds a Library resource URI from a Library URI and Library-relative path.
 */
export function libraryResourceUri(libraryUri: string, path: string): string {
  const cleanPath = path.replace(/^\/+/, "");
  return cleanPath ? `${libraryUri}/${cleanPath}` : libraryUri;
}
