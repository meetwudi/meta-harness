// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.storage-abstraction: lists local filesystem directories through storage.

import { readdir } from "node:fs/promises";

/**
 * Lists one local filesystem directory.
 */
export async function listDirectory(path: string): Promise<{ name: string; isDirectory: boolean }[]> {
  const entries = await readdir(path, { withFileTypes: true });
  return entries.map((entry) => ({
    name: entry.name,
    isDirectory: entry.isDirectory(),
  }));
}
