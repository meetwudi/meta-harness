// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.library-index-goal-input: reads project defaults from managed project metadata.

import { readFileSync } from "node:fs";
import { join } from "node:path";

export type MetaHarnessConfig = {
  project?: {
    name?: string;
    localRoot?: string;
  };
};

/**
 * Reads the managed project's Meta Harness metadata file.
 */
export function loadMetaHarnessConfig(repoRoot: string): MetaHarnessConfig {
  return JSON.parse(readFileSync(join(repoRoot, ".meta-harness.json"), "utf8"));
}
