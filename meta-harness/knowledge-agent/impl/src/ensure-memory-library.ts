// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.library-writes-memory: creates the writable Knowledge Agent memory Library.
// Supports knowledge-agent.postgres-runtime-storage: creates the memory Library through the runtime storage driver.

import { join } from "node:path";
import type { LibrarianStorage } from "../../../librarian/impl/dist/index.js";
import { MEMORY_LIBRARY_NAME } from "./constants.js";

/**
 * Creates the Knowledge Agent memory Library used by multiple conversations.
 */
export async function ensureMemoryLibrary(
  storage: LibrarianStorage,
  root: string,
): Promise<void> {
  await storage.makeDirectory(root);
  const libraryToml = join(root, "LIBRARY.toml");
  if (!(await storage.exists(libraryToml))) {
    await storage.writeText(
      libraryToml,
      [
        "# This is a Harness primitive.",
        "# See also: library://meta-harness",
        "",
        `name = "${MEMORY_LIBRARY_NAME}"`,
        'description = "Durable Memory Library shared across Knowledge Agent conversations for retrievable values, notes, and summaries."',
        'read_actors = ["actor://knowledge-agent"]',
        'update_actors = ["actor://knowledge-agent"]',
        "",
      ].join("\n"),
    );
  }
  const memoryToml = join(root, "MEMORY.toml");
  if (!(await storage.exists(memoryToml))) {
    await storage.writeText(
      memoryToml,
      [
        "# This is a Harness primitive.",
        "# See also: library://meta-harness",
        "",
        "instructions = [",
        '  "Store memory artifacts shared across Knowledge Agent conversations.",',
        '  "Keep values retrievable by later conversations.",',
        '  "Do not store provider credentials.",',
        "]",
        "",
      ].join("\n"),
    );
  }
}
