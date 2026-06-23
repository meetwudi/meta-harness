// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.storage-discovery-runtime: creates the prompt containing the goal.
// Supports knowledge-agent.library-writes-memory: lets the agent discover writable memory through storage discovery.
// Supports knowledge-agent.prompt-calls-librarian-intro: renders the prompt instruction to call Librarian intro.
// Supports knowledge-agent.task-handoffs: renders the shared prompt in Task Agent mode.

import type { ProviderRunOptions } from "./types.js";
import type { TaskDefinition } from "./task-definition.js";
import Mustache from "mustache";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export type KnowledgeAgentPromptOptions = Pick<
  ProviderRunOptions,
  "goal" | "repoRoot"
> & {
  task?: TaskDefinition;
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
    task: options.task
      ? {
        name: options.task.name,
        sourceLibrary: options.task.sourceLibrary,
        purpose: options.task.purpose,
        actorUri: options.task.actorUri,
      }
      : false,
  });
}
