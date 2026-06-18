// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.library-index-goal-input: exposes runtime Libraries through sandbox-local Library discovery.
// Supports knowledge-agent.library-writes-memory: lets the agent find writable memory without direct prompt paths.
// Supports knowledge-agent.library-scoped-sandbox-staging: preserves staged local Library index entries.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  CONVERSATIONS_LIBRARY_NAME,
  MEMORY_LIBRARY_NAME,
} from "./constants.js";
import type { ProviderRunOptions } from "./types.js";

/**
 * Writes the sandbox-local Library index entries for Knowledge Agent runtime Libraries.
 */
export async function writeSandboxLocalLibraryIndex(
  options: ProviderRunOptions,
): Promise<void> {
  const indexPath = join(
    options.sandboxRepoRoot,
    "harness",
    "libraries",
    "LIBRARIES.local.toml",
  );
  await mkdir(join(options.sandboxRepoRoot, "harness", "libraries"), {
    recursive: true,
  });
  let existing = "";
  try {
    existing = await readFile(indexPath, "utf8");
  } catch {
    existing = [
      "# Generated sandbox-local Library index for this Knowledge Agent conversation.",
      "# Runtime Libraries are exposed through the Library protocol, not direct prompt paths.",
      "",
    ].join("\n");
  }
  await writeFile(
    indexPath,
    [
      existing.trimEnd(),
      "",
      "[[libraries]]",
      `name = "${CONVERSATIONS_LIBRARY_NAME}"`,
      'location = "/workspace/conversations"',
      "",
      "[[libraries]]",
      `name = "${MEMORY_LIBRARY_NAME}"`,
      'location = "/workspace/memory"',
      "",
    ].join("\n"),
  );
}
