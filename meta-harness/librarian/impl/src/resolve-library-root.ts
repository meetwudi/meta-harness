// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.library-index-tool-context: resolves Library index locations deterministically.

import { isAbsolute, resolve } from "node:path";
import type { LibraryIndexEntry } from "./types.js";

/**
 * Resolves a Library entry to a filesystem root path.
 */
export function resolveLibraryRoot(basePath: string, entry: LibraryIndexEntry): string {
  const location = entry.location ?? entry.relative_location;
  if (!location) {
    throw new Error(`Library ${entry.name} is missing location`);
  }
  return isAbsolute(location) ? resolve(location) : resolve(basePath, location);
}
