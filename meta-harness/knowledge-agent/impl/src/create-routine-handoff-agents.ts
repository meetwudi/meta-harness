// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.routine-handoffs: creates OpenAI Agents SDK handoffs for Meta Harness Routines.

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
import { discoverRepositoryRoutines } from "./discover-repository-routines.js";
import { knowledgeAgentCapabilities } from "./knowledge-agent-capabilities.js";

/**
 * Creates one Routine-backed handoff agent for each repository Routine definition.
 */
export function createRoutineHandoffAgents(input: {
  repoRoot: string;
  goal: string;
  model: string;
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
      instructions: [
        RECOMMENDED_PROMPT_PREFIX,
        routinePrompt,
      ].join("\n\n"),
      tools: createLibrarianOpenAITools(routineContext),
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
