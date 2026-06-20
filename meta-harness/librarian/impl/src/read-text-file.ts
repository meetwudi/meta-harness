// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.storage-abstraction: implements local filesystem storage reads.

import { readFile } from "node:fs/promises";

/**
 * Reads a UTF-8 text file from the local filesystem.
 */
export async function readTextFile(path: string): Promise<string> {
  return readFile(path, "utf8");
}
