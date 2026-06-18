// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.library-scoped-sandbox-staging: reads TOML files used during Library staging.

import { readFile } from "node:fs/promises";
import { parseToml } from "./parse-toml.js";

/**
 * Reads and parses a TOML file from disk.
 */
export async function readTomlFile(path: string): Promise<Record<string, unknown>> {
  return parseToml(await readFile(path, "utf8"));
}
