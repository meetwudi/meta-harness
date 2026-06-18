// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.openai-trace-conversation-history: stores local conversation history and trace references.
// Supports knowledge-agent.storage-agnostic-runtime: implements local filesystem conversation record storage.

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { resultSummary } from "./result-summary.js";
import type { PreparedRuntime, ProviderRunOptions } from "./types.js";

/**
 * Writes the local conversation record containing prompt, run summary, and trace metadata.
 */
export async function recordLocalHistory(
  options: ProviderRunOptions & { provider: string },
  localRuntime: PreparedRuntime,
  prompt: string,
  result: unknown,
): Promise<void> {
  const recordedAt = new Date().toISOString();
  const conversationRoot = join(localRuntime.conversationsLibrary, options.conversationId);
  const record = {
    conversationId: options.conversationId,
    provider: options.provider,
    model: options.model,
    libraryIndex: options.libraryIndex,
    localRoot: localRuntime.localRoot,
    conversationsLibrary: localRuntime.conversationsLibrary,
    memoryLibrary: localRuntime.memoryLibrary,
    sandboxWorkspace: options.sandboxWorkspace,
    prompt,
    result: resultSummary(result),
    trace: {
      sdk: "OpenAI Agents SDK",
      workflowName: `knowledge-agent:${options.conversationId}`,
      exportedBySdkDefault: options.provider === "openai",
    },
    recordedAt,
  };
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
      `Library index: ${options.libraryIndex}`,
      "",
      `Provider: ${options.provider}`,
      "",
      `Model: ${options.model}`,
      "",
      `Memory Library: ${localRuntime.memoryLibrary}`,
      "",
      `Sandbox workspace: ${options.sandboxWorkspace}`,
      "",
    ].join("\n"),
  );
  await writeFile(
    join(conversationRoot, "record.json"),
    `${JSON.stringify(record, null, 2)}\n`,
  );
}
