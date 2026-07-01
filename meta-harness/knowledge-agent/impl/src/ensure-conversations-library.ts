// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.openai-trace-conversation-history: creates the runtime Library for timestamped conversation memory.
// Supports knowledge-agent.postgres-runtime-storage: creates the conversations Library through the runtime storage driver.

import { join } from "node:path";
import type { LibrarianStorage } from "../../../librarian/impl/dist/index.js";

/**
 * Creates the conversations Library used to store one folder per conversation.
 */
export async function ensureConversationsLibrary(
  storage: LibrarianStorage,
  root: string,
  name: string,
  actorUri: string,
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
        `name = ${JSON.stringify(name)}`,
        'description = "Conversation history Library for Knowledge Agent sessions, including prompts, summaries, trace references, and conversation records."',
        "isSystemLibrary = true",
        `read_actors = [${JSON.stringify(actorUri)}]`,
        "update_actors = []",
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
        '  "Store each Knowledge Agent conversation under a timestamped conversation id folder.",',
        '  "Keep prompts, summaries, trace references, and conversation records together.",',
        '  "Do not store provider credentials.",',
        "]",
        "",
      ].join("\n"),
    );
  }
}
