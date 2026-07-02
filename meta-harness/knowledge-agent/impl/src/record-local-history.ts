// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.openai-trace-conversation-history: stores conversation history and trace references.
// Supports knowledge-agent.storage-agnostic-runtime: implements storage-backed conversation record writes.
// Supports librarian.tool-call-observability: stores only Librarian tool call events in librarian-trace.json.
// Supports knowledge-agent.conversation-turns: stores each run as a conversation turn.
// Supports knowledge-agent.conversation-state: stores per-turn prompt state and next-turn state.
// Supports knowledge-agent.postgres-runtime-storage: writes conversation history through the runtime storage driver.
// Supports knowledge-agent.library-scoped-memory-curator: records the raw latest user message used for curation.

import { join } from "node:path";
import { recordConversationStateHistory } from "./conversation-state-history.js";
import { redactTextWithSessionSecrets } from "./local-jsonl-session.js";
import { resultSummary } from "./result-summary.js";
import type { PreparedRuntime, ProviderRunOptions } from "./types.js";

/**
 * Writes conversation prompt, summary, and Librarian trace files.
 */
export async function recordLocalHistory(
  options: ProviderRunOptions & { provider: string },
  localRuntime: PreparedRuntime,
  prompt: string,
  result: unknown,
): Promise<void> {
  const recordedAt = new Date().toISOString();
  const conversationRoot = localRuntime.conversationRoot;
  const turnRoot = join(conversationRoot, "turns", options.turnId);
  const beforeStateToml = options.conversationState.promptToml;
  const afterStateToml = options.conversationState.currentToml();
  const redact = (value: string): string =>
    redactTextWithSessionSecrets(options.session, value);
  await localRuntime.runtimeStorage.makeDirectory(turnRoot);
  await localRuntime.runtimeStorage.writeText(
    join(conversationRoot, "CONVERSATION.toml"),
    [
      `conversation_id = ${JSON.stringify(options.conversationId)}`,
      `session_file = ${JSON.stringify("session.jsonl")}`,
      "",
    ].join("\n"),
  );
  await localRuntime.runtimeStorage.writeText(join(turnRoot, "prompt.md"), `${redact(prompt)}\n`);
  await localRuntime.runtimeStorage.writeText(
    join(turnRoot, "conversation-state.toml"),
    beforeStateToml,
  );
  await localRuntime.runtimeStorage.writeText(
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
  await localRuntime.runtimeStorage.writeText(
    join(turnRoot, "summary.md"),
    [
      `# Turn ${options.turnId}`,
      "",
      `Started: ${recordedAt}`,
      "",
      `Conversation: ${options.conversationId}`,
      "",
      `User request: ${redact(options.goal)}`,
      "",
      `Latest user message: ${redact(options.latestUserMessage)}`,
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
  await localRuntime.runtimeStorage.writeText(
    join(turnRoot, "librarian-trace.json"),
    `${JSON.stringify(options.librarianContext.toolCallEvents, null, 2)}\n`,
  );
  const memoryCurator = resultSummary(result).memoryCurator;
  if (memoryCurator !== undefined) {
    await localRuntime.runtimeStorage.writeText(
      join(turnRoot, "memory-curator-trace.json"),
      `${redact(JSON.stringify(memoryCurator, null, 2))}\n`,
    );
  }
}
