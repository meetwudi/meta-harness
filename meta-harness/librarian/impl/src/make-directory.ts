// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.storage-abstraction: creates directories through the local filesystem backend.

import { mkdir } from "node:fs/promises";

/**
 * Creates a local filesystem directory and any missing parents.
 */
export async function makeDirectory(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}
