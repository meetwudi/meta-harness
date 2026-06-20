// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.direct-storage-updates: constrains writes to the selected Library root.

import { relative, resolve } from "node:path";

/**
 * Resolves a Library-relative file path while preventing escape from the Library root.
 */
export function resolveLibraryFilePath(rootPath: string, relativePath: string): string {
  const resolved = resolve(rootPath, relativePath);
  const outbound = relative(rootPath, resolved);
  if (outbound.startsWith("..") || outbound === ".." || outbound === "") {
    if (outbound === "") {
      return resolved;
    }
    throw new Error(`Path escapes Library root: ${relativePath}`);
  }
  return resolved;
}
