// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.task-handoffs: creates OpenAI Agents SDK handoffs for Meta Harness Tasks.

import type { LibrarianContext } from "../../../librarian/impl/dist/index.js";
import {
  handoff,
  user,
  type Handoff,
  type TextOutput,
} from "@openai/agents";
import { RECOMMENDED_PROMPT_PREFIX } from "@openai/agents-core/extensions";
import { type Manifest, SandboxAgent } from "@openai/agents/sandbox";
import { buildKnowledgeAgentPrompt } from "./build-knowledge-agent-prompt.js";
import { createLibrarianOpenAITools } from "./create-librarian-openai-tools.js";
import { createTaskLibrarianContext } from "./create-task-librarian-context.js";
import { discoverRepositoryTasks } from "./discover-repository-tasks.js";
import { knowledgeAgentCapabilities } from "./knowledge-agent-capabilities.js";

/**
 * Creates one task-backed handoff agent for each repository Task definition.
 */
export function createTaskHandoffAgents(input: {
  repoRoot: string;
  goal: string;
  model: string;
  manifest: Manifest;
  librarianContext: LibrarianContext;
}): Handoff<unknown, TextOutput>[] {
  return discoverRepositoryTasks(input.repoRoot).map((task) => {
    const taskContext = createTaskLibrarianContext(
      input.librarianContext,
      task.actorUri,
    );
    const taskPrompt = buildKnowledgeAgentPrompt({
      repoRoot: input.repoRoot,
      goal: input.goal,
      task,
    });
    const taskAgent = new SandboxAgent({
      name: `Meta Harness Task ${task.name}`,
      handoffDescription: `Run Meta Harness task ${task.name}: ${task.purpose}`,
      model: input.model,
      instructions: [
        RECOMMENDED_PROMPT_PREFIX,
        taskPrompt,
      ].join("\n\n"),
      tools: createLibrarianOpenAITools(taskContext),
      defaultManifest: input.manifest,
      capabilities: knowledgeAgentCapabilities(),
    });
    return handoff(taskAgent, {
      inputFilter: (handoffInputData) => ({
        ...handoffInputData,
        inputHistory: [user(taskPrompt)],
      }),
    });
  });
}
