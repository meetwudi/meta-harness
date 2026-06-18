// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.library-index-goal-input: creates the single prompt containing Library index and goal.
// Supports knowledge-agent.library-writes-memory: lets the agent discover writable memory through Library indexes.

import type { ProviderRunOptions } from "./types.js";
import Mustache from "mustache";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveUnderRepo } from "./resolve-under-repo.js";
import { sandboxRepoPath } from "./sandbox-repo-path.js";

/**
 * Renders the Knowledge Agent request prompt from the Library index and goal.
 */
export function buildRequest(options: ProviderRunOptions): string {
  const libraryIndexHostPath = resolveUnderRepo(
    options.repoRoot,
    options.libraryIndex,
  );
  const sandboxIndexPath = sandboxRepoPath(options.repoRoot, libraryIndexHostPath);
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
    libraryIndex: sandboxIndexPath,
  });
}
