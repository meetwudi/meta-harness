// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.direct-storage-updates: writes updates directly to local filesystem storage.

import { writeFile } from "node:fs/promises";

/**
 * Writes a UTF-8 text file to the local filesystem.
 */
export async function writeTextFile(path: string, content: string): Promise<void> {
  await writeFile(path, content);
}
