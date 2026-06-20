// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.storage-abstraction: checks local filesystem storage existence.

import { access } from "node:fs/promises";

/**
 * Returns whether a local filesystem path exists.
 */
export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
