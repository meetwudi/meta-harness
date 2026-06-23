// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.goal-auditor-agent: creates an independent Goal Auditor handoff agent.
// Supports knowledge-agent.prompt-calls-librarian-intro: gives the auditor the shared starter prompt.

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
import { createGoalAuditorLibrarianContext } from "./create-goal-auditor-librarian-context.js";
import { createGoalOpenAITools } from "./create-goal-openai-tools.js";
import { createLibrarianOpenAITools } from "./create-librarian-openai-tools.js";
import { knowledgeAgentCapabilities } from "./knowledge-agent-capabilities.js";

const GOAL_AUDITOR_ACTOR_URI = "actor://goal-auditor";

/**
 * Creates the independent Goal Auditor handoff agent.
 */
export function createGoalAuditorHandoffAgent(input: {
  repoRoot: string;
  goal: string;
  model: string;
  manifest: Manifest;
  librarianContext: LibrarianContext;
}): Handoff<unknown, TextOutput> {
  const auditorContext = createGoalAuditorLibrarianContext(
    input.librarianContext,
    GOAL_AUDITOR_ACTOR_URI,
  );
  const auditorPrompt = buildKnowledgeAgentPrompt({
    repoRoot: input.repoRoot,
    goal: input.goal,
    goalAudit: {
      actorUri: GOAL_AUDITOR_ACTOR_URI,
    },
  });
  const auditorAgent = new SandboxAgent({
    name: "Meta Harness Goal Auditor",
    handoffDescription: "Audit whether a Meta Harness Goal is met and record an independent audit signal.",
    model: input.model,
    instructions: [
      RECOMMENDED_PROMPT_PREFIX,
      auditorPrompt,
    ].join("\n\n"),
    tools: [
      ...createLibrarianOpenAITools(auditorContext),
      ...createGoalOpenAITools(auditorContext, { includeAuditTool: true }),
    ],
    defaultManifest: input.manifest,
    capabilities: knowledgeAgentCapabilities(),
  });
  return handoff(auditorAgent, {
    inputFilter: (handoffInputData) => ({
      ...handoffInputData,
      inputHistory: [user(auditorPrompt)],
    }),
  });
}
