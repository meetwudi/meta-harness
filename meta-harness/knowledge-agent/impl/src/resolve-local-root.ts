// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.openai-trace-conversation-history: resolves the local Knowledge Agent root from project metadata.

import { homedir } from "node:os";
import { isAbsolute, resolve } from "node:path";

/**
 * Resolves an absolute local root path from a configured path value.
 */
export function resolveLocalRoot(repoRoot: string, input: string): string {
  if (input === "~") {
    return homedir();
  }
  if (input.startsWith("~/")) {
    return resolve(homedir(), input.slice(2));
  }
  if (isAbsolute(input)) {
    return resolve(input);
  }
  return resolve(repoRoot, input);
}
