// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.library-index-only-agent-input: exposes runtime Libraries through a Library index.
// Supports knowledge-agent.uses-librarian: gives Librarian an index for local Knowledge Agent Libraries.

import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  CONVERSATIONS_LIBRARY_NAME,
  MEMORY_LIBRARY_NAME,
} from "./constants.js";
import type { PreparedRuntime } from "./types.js";

/**
 * Writes the Knowledge Agent runtime Library index under the local root.
 */
export async function writeRuntimeLibraryIndex(
  runtime: PreparedRuntime,
): Promise<void> {
  await writeFile(
    runtime.runtimeLibraryIndex,
    [
      "# Generated Knowledge Agent runtime Library index.",
      "",
      "[[libraries]]",
      `name = "${MEMORY_LIBRARY_NAME}"`,
      `location = ${JSON.stringify(runtime.memoryLibrary)}`,
      "",
      "[[libraries]]",
      `name = "${CONVERSATIONS_LIBRARY_NAME}"`,
      `location = ${JSON.stringify(runtime.conversationsLibrary)}`,
      "",
    ].join("\n"),
  );
}
