// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.library-scoped-sandbox-staging: reads Library agent_excludes.

import { join } from "node:path";
import { readTomlFile } from "./read-toml-file.js";

/**
 * Loads agent_excludes patterns from a filesystem Library root.
 */
export async function loadAgentExcludes(libraryRoot: string): Promise<string[]> {
  const data = await readTomlFile(join(libraryRoot, "LIBRARY.toml"));
  const value = data.agent_excludes;
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}
