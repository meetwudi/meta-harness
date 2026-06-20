// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.library-index-goal-input: delegates the actual goal work to the Agents SDK run loop.
// Supports knowledge-agent.openai-trace-conversation-history: returns the SDK trace metadata for local history.

import { run } from "@openai/agents";
import type { Trace } from "@openai/agents";
import type { SandboxAgent } from "@openai/agents/sandbox";
import type { OpenAISandboxRunOptions } from "./types.js";

/**
 * Executes the SandboxAgent run and returns the result together with trace metadata.
 */
export async function executeOpenAISandboxRun(
  agent: SandboxAgent,
  options: OpenAISandboxRunOptions,
  trace: Trace,
): Promise<Record<string, unknown>> {
  const result = await run(
    agent,
    "Open knowledge-agent/request.md and follow the goal.",
    {
      maxTurns: 24,
      sandbox: {
        client: options.sandboxClient,
        snapshot: {
          type: "local",
          baseDir: options.sandboxWorkspace,
        },
        concurrencyLimits: {
          manifestEntries: 4,
          localDirFiles: 16,
        },
      },
    },
  );
  return {
    result,
    trace: trace.toJSON(),
  };
}
