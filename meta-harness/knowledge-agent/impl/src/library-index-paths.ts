// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.library-scoped-sandbox-staging: discovers checked-in and local Library indexes.

import { access } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

/**
 * Returns the Library indexes that should be staged for a requested index path.
 */
export async function libraryIndexPaths(libraryIndexPath: string): Promise<string[]> {
  if (basename(libraryIndexPath) !== "LIBRARIES.toml") {
    return [libraryIndexPath];
  }
  const localIndex = join(dirname(libraryIndexPath), "LIBRARIES.local.toml");
  try {
    await access(localIndex);
    return [libraryIndexPath, localIndex];
  } catch {
    return [libraryIndexPath];
  }
}
