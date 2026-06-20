// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.provider-interface: implements the OpenAI provider through the shared provider interface.
// Supports knowledge-agent.openai-trace-conversation-history: wraps the SDK run in OpenAI Agents SDK tracing.
// Supports knowledge-agent.library-index-only-agent-input: traces only agent-facing inputs, not host-local Library paths.
// Supports knowledge-agent.uses-librarian: attaches Librarian tools to the OpenAI agent.

import { getGlobalTraceProvider, withTrace } from "@openai/agents";
import { Capabilities, SandboxAgent } from "@openai/agents/sandbox";
import { buildManifest } from "./build-manifest.js";
import { createLibrarianOpenAITools } from "./create-librarian-openai-tools.js";
import { createSandboxClient } from "./create-sandbox-client.js";
import { executeOpenAISandboxRun } from "./execute-openai-sandbox-run.js";
import type { ProviderRunOptions } from "./types.js";

/**
 * Runs one Knowledge Agent conversation through the OpenAI Agents SDK sandbox and trace APIs.
 */
export async function runOpenAIConversation(
  options: ProviderRunOptions,
): Promise<unknown> {
  const manifest = buildManifest(options);
  const agent = new SandboxAgent({
    name: "Meta Harness Knowledge Agent",
    model: options.model,
    instructions: [
      "You are the Meta Harness Knowledge Agent.",
      "Read knowledge-agent/request.md, then follow the goal.",
      "Use Librarian tools for Library discovery, reads, and writes.",
      "Follow Library governance reported by Librarian before writing files.",
    ].join(" "),
    tools: createLibrarianOpenAITools(options.librarianContext),
    defaultManifest: manifest,
    capabilities: [...Capabilities.default()],
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
