// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.library-scoped-sandbox-staging: applies default and Library-declared staging excludes.

import { relative } from "node:path";

/**
 * Decides whether a filesystem path should be staged for a Library.
 */
export function shouldStageLibraryPath(
  source: string,
  libraryRoot: string,
  agentExcludes: string[],
): boolean {
  const rel = relative(libraryRoot, source).split("\\").join("/");
  if (!rel) {
    return true;
  }
  const parts = rel.split("/");
  if (parts.some((part) => [".git", ".meta-harness", "node_modules", "dist"].includes(part))) {
    return false;
  }
  return !agentExcludes.some((pattern) => {
    const normalized = pattern.replace(/^\.?\//, "").replace(/\\/g, "/");
    if (!normalized) {
      return false;
    }
    if (normalized.endsWith("/**")) {
      const prefix = normalized.slice(0, -3);
      return rel === prefix || rel.startsWith(`${prefix}/`);
    }
    if (normalized.endsWith("/")) {
      const prefix = normalized.slice(0, -1);
      return rel === prefix || rel.startsWith(`${prefix}/`);
    }
    return rel === normalized || rel.startsWith(`${normalized}/`);
  });
}
