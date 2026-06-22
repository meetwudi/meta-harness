// Generated file. Do not edit directly; update the Spec first.
// Supports storage.driver-unit-operations: deletes paths through local filesystem storage.

import { rm } from "node:fs/promises";

/**
 * Deletes a local filesystem path when it exists.
 */
export async function deletePath(path: string): Promise<void> {
  await rm(path, { force: true, recursive: true });
}
