// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.openai-trace-conversation-history: stores local conversation history and trace references.
// Supports knowledge-agent.storage-agnostic-runtime: implements local filesystem conversation record storage.
// Supports librarian.tool-call-observability: stores only Librarian tool call events in librarian-trace.json.

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { PreparedRuntime, ProviderRunOptions } from "./types.js";

/**
 * Writes local conversation prompt, summary, and Librarian trace files.
 */
export async function recordLocalHistory(
  options: ProviderRunOptions & { provider: string },
  localRuntime: PreparedRuntime,
  prompt: string,
  _result: unknown,
): Promise<void> {
  const recordedAt = new Date().toISOString();
  const conversationRoot = join(localRuntime.conversationsLibrary, options.conversationId);
  await mkdir(conversationRoot, { recursive: true });
  await writeFile(join(conversationRoot, "prompt.md"), `${prompt}\n`);
  await writeFile(
    join(conversationRoot, "summary.md"),
    [
      `# Conversation ${options.conversationId}`,
      "",
      `Started: ${recordedAt}`,
      "",
      `Goal: ${options.goal}`,
      "",
      `Provider: ${options.provider}`,
      "",
      `Model: ${options.model}`,
      "",
      `Librarian tool calls: ${options.librarianContext.toolCallEvents.length}`,
      "",
      `Sandbox workspace: ${options.sandboxWorkspace}`,
      "",
    ].join("\n"),
  );
  await writeFile(
    join(conversationRoot, "librarian-trace.json"),
    `${JSON.stringify(options.librarianContext.toolCallEvents, null, 2)}\n`,
  );
}
