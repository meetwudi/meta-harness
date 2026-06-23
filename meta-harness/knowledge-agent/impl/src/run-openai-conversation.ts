// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.provider-interface: implements the OpenAI provider through the shared provider interface.
// Supports knowledge-agent.openai-trace-conversation-history: wraps the SDK run in OpenAI Agents SDK tracing.
// Supports knowledge-agent.uses-librarian: traces only agent-facing inputs, not host-local Library paths.
// Supports knowledge-agent.uses-librarian: attaches Librarian tools to the OpenAI agent.
// Supports knowledge-agent.harness-owned-session: runs with the session provided by the Harness runtime.
// Supports knowledge-agent.routine-handoffs: exposes Meta Harness Routines as Routine-scoped handoff agents.
// Supports knowledge-agent.goal-auditor-agent: exposes an independent Goal Auditor handoff agent.
// Supports knowledge-agent.goal-shared-interface: exposes shared Goal tools to the Knowledge Agent.

import { getGlobalTraceProvider, withTrace } from "@openai/agents";
import { RECOMMENDED_PROMPT_PREFIX } from "@openai/agents-core/extensions";
import { SandboxAgent } from "@openai/agents/sandbox";
import { buildManifest } from "./build-manifest.js";
import { createGoalAuditorHandoffAgent } from "./create-goal-auditor-handoff-agent.js";
import { createGoalOpenAITools } from "./create-goal-openai-tools.js";
import { createLibrarianOpenAITools } from "./create-librarian-openai-tools.js";
import { createSandboxClient } from "./create-sandbox-client.js";
import { createRoutineHandoffAgents } from "./create-routine-handoff-agents.js";
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
  const routineHandoffs = createRoutineHandoffAgents({
    repoRoot: options.repoRoot,
    goal: options.goal,
    model: options.model,
    manifest,
    librarianContext: options.librarianContext,
  });
  const goalAuditorHandoff = createGoalAuditorHandoffAgent({
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
      "Never claim an independent Goal audit result yourself. After goal_request_audit, hand off to Meta Harness Goal Auditor with the returned payload and report an audit signal only after goal_complete_audit succeeds.",
    ].join(" "),
    handoffs: [
      ...routineHandoffs,
      goalAuditorHandoff,
    ],
    tools: [
      ...createLibrarianOpenAITools(options.librarianContext),
      ...createGoalOpenAITools(options.librarianContext),
    ],
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
