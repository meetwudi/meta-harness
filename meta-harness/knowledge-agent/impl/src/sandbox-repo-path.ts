// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.library-index-goal-input: converts a host Library index path into the sandbox workspace path.

import { isAbsolute, relative } from "node:path";

/**
 * Converts a host repository path into the corresponding path inside the sandbox workspace.
 */
export function sandboxRepoPath(repoRoot: string, hostPath: string): string {
  const rel = relative(repoRoot, hostPath);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    return hostPath;
  }
  return `repo/${rel.split("\\").join("/")}`;
}
