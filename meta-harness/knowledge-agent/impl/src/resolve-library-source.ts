// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.library-scoped-sandbox-staging: resolves filesystem Library sources from index entries.

import { isAbsolute, resolve } from "node:path";
import type { LibraryIndexEntry } from "./types.js";

/**
 * Resolves a filesystem Library entry to a host source path when possible.
 */
export function resolveLibrarySource(
  repoRoot: string,
  entry: LibraryIndexEntry,
): string | undefined {
  if (typeof entry.relative_location === "string" && entry.relative_location.trim()) {
    return resolve(repoRoot, entry.relative_location);
  }
  if (typeof entry.location !== "string" || !entry.location.trim()) {
    return undefined;
  }
  if (entry.location.startsWith("~")) {
    return resolve(process.env.HOME ?? "", entry.location.slice(2));
  }
  if (isAbsolute(entry.location)) {
    return resolve(entry.location);
  }
  return undefined;
}
