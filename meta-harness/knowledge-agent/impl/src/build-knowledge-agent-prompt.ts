// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.storage-discovery-runtime: creates the prompt containing the goal.
// Supports knowledge-agent.library-writes-memory: lets the agent discover writable memory through storage discovery.
// Supports knowledge-agent.prompt-calls-librarian-intro: renders the prompt instruction to call Librarian intro.
// Supports knowledge-agent.routine-handoffs: renders the shared prompt in Routine Agent mode.
// Supports knowledge-agent.goal-auditor-agent: renders the shared prompt in Goal Audit mode.
// Supports knowledge-agent.goal-shared-interface: tells agents to use shared Goal tools.

import type { ProviderRunOptions } from "./types.js";
import type { RoutineDefinition } from "./routine-definition.js";
import Mustache from "mustache";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export type KnowledgeAgentPromptOptions = Pick<
  ProviderRunOptions,
  "goal" | "repoRoot"
> & {
  routine?: RoutineDefinition;
  goalAudit?: {
    actorUri: string;
  };
};

/**
 * Renders the shared Knowledge Agent starter prompt.
 */
export function buildKnowledgeAgentPrompt(
  options: KnowledgeAgentPromptOptions,
): string {
  const template = readFileSync(
    join(
      options.repoRoot,
      "meta-harness",
      "knowledge-agent",
      "impl",
      "prompts",
      "knowledge-agent.md.mustache",
    ),
    "utf8",
  );
  return Mustache.render(template, {
    goal: options.goal,
    routine: options.routine
      ? {
        name: options.routine.name,
        sourceLibrary: options.routine.sourceLibrary,
        purpose: options.routine.purpose,
        actorUri: options.routine.actorUri,
      }
      : false,
    goalAudit: options.goalAudit
      ? {
        actorUri: options.goalAudit.actorUri,
      }
      : false,
  });
}
