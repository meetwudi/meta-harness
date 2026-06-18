// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.library-index-goal-input: resolves the Library index path supplied to the CLI.

import { isAbsolute, resolve } from "node:path";

/**
 * Resolves an input path relative to the repository root unless it is already absolute.
 */
export function resolveUnderRepo(repoRoot: string, input: string): string {
  return isAbsolute(input) ? resolve(input) : resolve(repoRoot, input);
}
