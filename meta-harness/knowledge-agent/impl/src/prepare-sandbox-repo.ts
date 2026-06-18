// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.library-index-goal-input: prepares a sandbox-safe repo workspace for SDK filesystem discovery.
// Supports knowledge-agent.library-scoped-sandbox-staging: stages only indexed Libraries instead of copying the whole repo.

import { rm } from "node:fs/promises";
import type { ProviderRunOptions } from "./types.js";
import { stageLibraryIndexes } from "./stage-library-indexes.js";

/**
 * Recreates the sandbox repository workspace from files safe to expose to the SDK sandbox.
 */
export async function prepareSandboxRepo(
  options: ProviderRunOptions,
): Promise<void> {
  await rm(options.sandboxRepoRoot, { recursive: true, force: true });
  // Harness-Requirement: knowledge-agent.library-scoped-sandbox-staging
  await stageLibraryIndexes(options);
}
