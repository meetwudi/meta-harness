// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.library-index-goal-input: finds the project root that contains the Library index.

import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/**
 * Walks upward from a start path to find the Meta Harness repository root.
 */
export function findRepoRoot(start: string): string {
  let current = resolve(start);
  for (;;) {
    if (
      existsSync(join(current, "meta-harness")) &&
      existsSync(join(current, "harness"))
    ) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      throw new Error("could not find Meta Harness repository root");
    }
    current = parent;
  }
}
