// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.library-index-tool-context: reads TOML through the configured storage backend.

import { parseToml } from "./parse-toml.js";
import type { LibrarianStorage, TomlRecord } from "./types.js";

/**
 * Reads and parses a TOML file through Librarian storage.
 */
export async function readTomlFile(
  storage: LibrarianStorage,
  path: string,
): Promise<TomlRecord> {
  return parseToml(await storage.readText(path));
}
