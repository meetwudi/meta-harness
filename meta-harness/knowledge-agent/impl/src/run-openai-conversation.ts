// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.provider-interface: implements the OpenAI provider through the shared provider interface.
// Supports knowledge-agent.openai-trace-conversation-history: wraps the SDK run in OpenAI Agents SDK tracing.
// Supports knowledge-agent.uses-librarian: traces only agent-facing inputs, not host-local Library paths.
// Supports knowledge-agent.uses-librarian: attaches Librarian tools to the OpenAI agent.
// Supports knowledge-agent.harness-owned-session: runs with the session provided by the Harness runtime.
// Supports knowledge-agent.task-handoffs: exposes Meta Harness Tasks as task-scoped handoff agents.

import { getGlobalTraceProvider, withTrace } from "@openai/agents";
import { RECOMMENDED_PROMPT_PREFIX } from "@openai/agents-core/extensions";
import { SandboxAgent } from "@openai/agents/sandbox";
import { buildManifest } from "./build-manifest.js";
import { createLibrarianOpenAITools } from "./create-librarian-openai-tools.js";
import { createSandboxClient } from "./create-sandbox-client.js";
import { createTaskHandoffAgents } from "./create-task-handoff-agents.js";
import { executeOpenAISandboxRun } from "./execute-openai-sandbox-run.js";
import { knowledgeAgentCapabilities } from "./knowledge-agent-capabilities.js";
import type { ProviderRunOptions } from "./types.js";

/**
 * Runs one Knowledge Agent conversation through the OpenAI Agents SDK sandbox and trace APIs.
 */
export async function runOpenAIConversation(
  options: ProviderRunOptions,
): Promise<unknown> {
  const manifest = buildManifest(options);
  const taskHandoffs = createTaskHandoffAgents({
    repoRoot: options.repoRoot,
    goal: options.goal,
    model: options.model,
    manifest,
    librarianContext: options.librarianContext,
  });
  const agent = new SandboxAgent({
    name: "Meta Harness Knowledge Agent",
    model: options.model,
    instructions: [
      RECOMMENDED_PROMPT_PREFIX,
      "You are the Meta Harness Knowledge Agent.",
      "Follow the shared Knowledge Agent starter prompt in knowledge-agent/knowledge-agent.md and in the run input.",
    ].join(" "),
    handoffs: taskHandoffs,
    tools: createLibrarianOpenAITools(options.librarianContext),
    defaultManifest: manifest,
    capabilities: knowledgeAgentCapabilities(),
  });
  const tracedResult = await withTrace(
    `knowledge-agent:${options.conversationId}`,
    executeOpenAISandboxRun.bind(undefined, agent, {
      ...options,
      sandboxClient: createSandboxClient(options.client),
    }),
    {
      metadata: {
        conversationId: options.conversationId,
      },
    },
  );
  await getGlobalTraceProvider().forceFlush();
  return tracedResult;
}
