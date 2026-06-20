// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.library-index-tool-context: loads indexed Libraries from the hidden Library index context.

import { dirname } from "node:path";
import { readTomlFile } from "./read-toml-file.js";
import type { LibrarianStorage, LibraryIndexEntry } from "./types.js";

/**
 * Loads Library entries from a Library index path.
 */
export async function loadLibraryIndexEntries(
  storage: LibrarianStorage,
  indexPath: string,
): Promise<{ basePath: string; entries: LibraryIndexEntry[] }> {
  const data = await readTomlFile(storage, indexPath);
  const entries = data.libraries;
  if (!Array.isArray(entries)) {
    throw new Error(`${indexPath}: libraries must be an array of tables`);
  }
  return {
    basePath: dirname(indexPath),
    entries: entries.map((entry) => entry as LibraryIndexEntry),
  };
}
