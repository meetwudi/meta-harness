// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.library-scoped-sandbox-staging: loads Library entries from Library indexes.

import { readTomlFile } from "./read-toml-file.js";
import type { LibraryIndexEntry, LibraryIndexEntries } from "./types.js";

/**
 * Loads Library index entries from a TOML index file.
 */
export async function loadLibraryIndexEntries(path: string): Promise<LibraryIndexEntries> {
  const data = await readTomlFile(path);
  const entries = data.libraries;
  if (!Array.isArray(entries)) {
    throw new Error(`${path}: libraries must be an array of tables`);
  }
  return {
    path,
    entries: entries.map((entry) => entry as LibraryIndexEntry),
  };
}
