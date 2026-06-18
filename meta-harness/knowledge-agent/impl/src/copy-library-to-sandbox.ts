// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.library-scoped-sandbox-staging: copies one filesystem Library into the sandbox.

import { cp, mkdir, rm } from "node:fs/promises";
import { dirname } from "node:path";
import { loadAgentExcludes } from "./load-agent-excludes.js";
import { shouldStageLibraryPath } from "./should-stage-library-path.js";

/**
 * Copies a filesystem Library into its sandbox location while applying agent_excludes.
 */
export async function copyLibraryToSandbox(
  sourcePath: string,
  targetPath: string,
): Promise<void> {
  const agentExcludes = await loadAgentExcludes(sourcePath);
  await rm(targetPath, { recursive: true, force: true });
  await mkdir(dirname(targetPath), { recursive: true });
  await cp(sourcePath, targetPath, {
    recursive: true,
    filter: (source) => shouldStageLibraryPath(source, sourcePath, agentExcludes),
  });
}
