// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.openai-trace-conversation-history: stores local conversation history and trace references.
// Supports knowledge-agent.storage-agnostic-runtime: implements local filesystem conversation record storage.
// Supports librarian.tool-call-observability: stores only Librarian tool call events in librarian-trace.json.
// Supports knowledge-agent.conversation-turns: stores each run as a conversation turn.
// Supports knowledge-agent.conversation-state: stores per-turn prompt state and next-turn state.

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { recordConversationStateHistory } from "./conversation-state-history.js";
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
  const conversationRoot = localRuntime.conversationRoot;
  const turnRoot = join(conversationRoot, "turns", options.turnId);
  const beforeStateToml = options.conversationState.promptToml;
  const afterStateToml = options.conversationState.currentToml();
  await mkdir(turnRoot, { recursive: true });
  await writeFile(
    join(conversationRoot, "CONVERSATION.toml"),
    [
      `conversation_id = ${JSON.stringify(options.conversationId)}`,
      `session_file = ${JSON.stringify("session.jsonl")}`,
      "",
    ].join("\n"),
  );
  await writeFile(join(turnRoot, "prompt.md"), `${prompt}\n`);
  await writeFile(
    join(turnRoot, "conversation-state.toml"),
    beforeStateToml,
  );
  await writeFile(
    join(turnRoot, "conversation-state-after.toml"),
    afterStateToml,
  );
  await recordConversationStateHistory({
    runtime: localRuntime,
    turnId: options.turnId,
    beforeStateToml,
    afterStateToml,
    recordedAt,
  });
  await writeFile(
    join(turnRoot, "summary.md"),
    [
      `# Turn ${options.turnId}`,
      "",
      `Started: ${recordedAt}`,
      "",
      `Conversation: ${options.conversationId}`,
      "",
      `User request: ${options.goal}`,
      "",
      `Provider: ${options.provider}`,
      "",
      `Model: ${options.model}`,
      "",
      "Conversation state: conversation-state.toml",
      "",
      "Next conversation state: conversation-state-after.toml",
      "",
      "Conversation state history: ../../conversation-state-history.toml",
      "",
      `Librarian tool calls: ${options.librarianContext.toolCallEvents.length}`,
      "",
      `Sandbox workspace: ${options.sandboxWorkspace}`,
      "",
      `Session file: ${localRuntime.sessionFile}`,
      "",
    ].join("\n"),
  );
  await writeFile(
    join(turnRoot, "librarian-trace.json"),
    `${JSON.stringify(options.librarianContext.toolCallEvents, null, 2)}\n`,
  );
}
