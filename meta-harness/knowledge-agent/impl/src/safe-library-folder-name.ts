// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.library-scoped-sandbox-staging: maps Library names into sandbox-safe folders.

/**
 * Converts a Library name into a filesystem-safe staging folder name.
 */
export function safeLibraryFolderName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "library";
}
