// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.library-scoped-sandbox-staging: renders staged Library indexes.

import type { LibraryIndexEntry } from "./types.js";

/**
 * Renders Library index entries as TOML.
 */
export function renderLibraryIndex(entries: LibraryIndexEntry[]): string {
  const lines = [
    "# Generated sandbox Library index.",
    "# Host-local paths are materialized into the sandbox before agent execution.",
    "",
  ];
  for (const entry of entries) {
    lines.push("[[libraries]]");
    lines.push(`name = ${JSON.stringify(entry.name)}`);
    if (entry.relative_location) {
      lines.push(`relative_location = ${JSON.stringify(entry.relative_location)}`);
    } else if (entry.location) {
      lines.push(`location = ${JSON.stringify(entry.location)}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
