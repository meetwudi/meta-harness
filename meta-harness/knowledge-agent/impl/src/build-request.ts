// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.storage-discovery-runtime: creates the prompt containing the goal.
// Supports knowledge-agent.library-writes-memory: lets the agent discover writable memory through storage discovery.
// Supports knowledge-agent.prompt-calls-librarian-intro: renders the prompt instruction to call Librarian intro.

import type { ProviderRunOptions } from "./types.js";
import Mustache from "mustache";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Renders the Knowledge Agent request prompt from the human goal.
 */
export function buildRequest(options: ProviderRunOptions): string {
  const template = readFileSync(
    join(
      options.repoRoot,
      "meta-harness",
      "knowledge-agent",
      "impl",
      "prompts",
      "knowledge-agent-request.md.mustache",
    ),
    "utf8",
  );
  return Mustache.render(template, {
    goal: options.goal,
  });
}
