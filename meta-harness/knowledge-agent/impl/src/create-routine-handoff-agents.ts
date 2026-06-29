// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.routine-handoffs: creates OpenAI Agents SDK handoffs for Meta Harness Routines.
// Supports knowledge-agent.web-search-tool: attaches hosted web search to Routine handoff agents.
// Supports knowledge-agent.provider-stream-events: requests safe reasoning summaries for Routine handoff streaming.

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
import { createRoutineLibrarianContext } from "./create-routine-librarian-context.js";
import { createWebSearchOpenAITools } from "./create-web-search-openai-tools.js";
import { discoverRepositoryRoutines } from "./discover-repository-routines.js";
import { knowledgeAgentCapabilities } from "./knowledge-agent-capabilities.js";
import { openAIReasoningSettings } from "./openai-reasoning-settings.js";
import type { ReasoningEffort } from "./types.js";

/**
 * Creates one Routine-backed handoff agent for each repository Routine definition.
 */
export function createRoutineHandoffAgents(input: {
  repoRoot: string;
  goal: string;
  model: string;
  reasoningEffort: ReasoningEffort;
  manifest: Manifest;
  librarianContext: LibrarianContext;
}): Handoff<unknown, TextOutput>[] {
  return discoverRepositoryRoutines(input.repoRoot).map((routine) => {
    const routineContext = createRoutineLibrarianContext(
      input.librarianContext,
      routine.actorUri,
    );
    const routinePrompt = buildKnowledgeAgentPrompt({
      repoRoot: input.repoRoot,
      goal: input.goal,
      routine,
    });
    const routineAgent = new SandboxAgent({
      name: `Meta Harness Routine ${routine.name}`,
      handoffDescription: `Execute Meta Harness Routine ${routine.name}: ${routine.purpose}`,
      model: input.model,
      modelSettings: {
        reasoning: openAIReasoningSettings(input.reasoningEffort),
      },
      instructions: [
        RECOMMENDED_PROMPT_PREFIX,
        routinePrompt,
      ].join("\n\n"),
      tools: [
        ...createLibrarianOpenAITools(routineContext),
        ...createWebSearchOpenAITools(),
      ],
      defaultManifest: input.manifest,
      capabilities: knowledgeAgentCapabilities(),
    });
    return handoff(routineAgent, {
      inputFilter: (handoffInputData) => ({
        ...handoffInputData,
        inputHistory: [user(routinePrompt)],
      }),
    });
  });
}
