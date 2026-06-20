// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.openai-trace-conversation-history: creates the local Library for timestamped conversation memory.

import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { CONVERSATIONS_LIBRARY_NAME } from "./constants.js";

/**
 * Creates the local conversations Library used to store one folder per conversation.
 */
export async function ensureConversationsLibrary(root: string): Promise<void> {
  await mkdir(root, { recursive: true });
  const libraryToml = join(root, "LIBRARY.toml");
  if (!existsSync(libraryToml)) {
    await writeFile(
      libraryToml,
      [
        "# This is a Harness primitive.",
        "# See also: library://meta-harness",
        "",
        `name = "${CONVERSATIONS_LIBRARY_NAME}"`,
        'description = "Conversation history Library for Knowledge Agent sessions, including prompts, summaries, trace references, and conversation records."',
        'read_actors = ["actor://knowledge-agent"]',
        'update_actors = ["actor://knowledge-agent"]',
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
        '  "Store each Knowledge Agent conversation under a timestamped conversation id folder.",',
        '  "Keep prompts, summaries, trace references, and local conversation records together.",',
        '  "Do not store provider credentials.",',
        "]",
        "",
      ].join("\n"),
    );
  }
}
