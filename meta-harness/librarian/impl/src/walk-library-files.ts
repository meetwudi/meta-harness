// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.shamanistic-library-tools: discovers files inside readable Libraries.
// Supports librarian.agent-excludes: omits excluded Library paths from file walks.

import { join } from "node:path";
import { isLibraryPathExcluded } from "./is-library-path-excluded.js";
import type { LibrarianStorage } from "./types.js";

/**
 * Walks Library files under a root and returns Library-relative paths.
 */
export async function walkLibraryFiles(
  storage: LibrarianStorage,
  rootPath: string,
  excludes: string[] = [],
  currentPath = "",
): Promise<string[]> {
  const absolutePath = currentPath ? join(rootPath, currentPath) : rootPath;
  const entries = await storage.listDirectory(absolutePath);
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      continue;
    }
    const relativePath = currentPath ? join(currentPath, entry.name) : entry.name;
    if (isLibraryPathExcluded(relativePath, excludes)) {
      continue;
    }
    if (entry.isDirectory) {
      files.push(...await walkLibraryFiles(storage, rootPath, excludes, relativePath));
    } else {
      files.push(relativePath);
    }
  }
  return files;
}
