// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.library-writes-memory: creates the writable Knowledge Agent memory Library.

import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { MEMORY_LIBRARY_NAME } from "./constants.js";

/**
 * Creates the Knowledge Agent memory Library used by multiple conversations.
 */
export async function ensureMemoryLibrary(root: string): Promise<void> {
  await mkdir(root, { recursive: true });
  const libraryToml = join(root, "LIBRARY.toml");
  if (!existsSync(libraryToml)) {
    await writeFile(
      libraryToml,
      [
        "# This is a Harness primitive.",
        "# See also: library://meta-harness",
        "",
        `name = "${MEMORY_LIBRARY_NAME}"`,
        'description = "Durable Memory Library shared across Knowledge Agent conversations for retrievable values, notes, and summaries."',
        "# read_tasks and update_tasks are Harness primitive Task URI patterns.",
        "# read_tasks controls which primitive Tasks may read this Library.",
        'read_tasks = ["library://*"]',
        "# update_tasks controls which primitive Tasks may update this Library.",
        'update_tasks = ["library://knowledge-agent/conversations/*"]',
        "",
      ].join("\n"),
    );
  }
  const memoryToml = join(root, "MEMORY.toml");
  if (!existsSync(memoryToml)) {
    await writeFile(
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
