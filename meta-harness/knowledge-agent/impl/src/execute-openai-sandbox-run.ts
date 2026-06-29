// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.provider-interface: delegates the actual goal work to the Agents SDK run loop.
// Supports knowledge-agent.openai-trace-conversation-history: returns the SDK trace metadata for local history.
// Supports knowledge-agent.harness-owned-session: passes Harness-owned session history to the SDK.
// Supports knowledge-agent.conversation-state: keeps current turn state from accumulating stale prompt blocks.
// Supports knowledge-agent.provider-stream-events: streams sanitized provider events when requested.
// Supports knowledge-agent.main-run-turn-budget: allows longer tool-rich main runs.

import { run } from "@openai/agents";
import type { Trace } from "@openai/agents";
import type { SandboxAgent } from "@openai/agents/sandbox";
import { buildKnowledgeAgentPrompt } from "./build-knowledge-agent-prompt.js";
import { knowledgeAgentStreamEventsFromRunEvent } from "./knowledge-agent-stream-events.js";
import { knowledgeAgentSessionInputCallback } from "./knowledge-agent-session-input.js";
import type { OpenAISandboxRunOptions } from "./types.js";

function finalOutputText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value === undefined || value === null) {
    return "";
  }
  return JSON.stringify(value);
}

function chunkText(value: string, size = 1200): string[] {
  const chunks: string[] = [];
  for (let index = 0; index < value.length; index += size) {
    chunks.push(value.slice(index, index + size));
  }
  return chunks;
}

/**
 * Executes the SandboxAgent run and returns the result together with trace metadata.
 */
export async function executeOpenAISandboxRun(
  agent: SandboxAgent,
  options: OpenAISandboxRunOptions,
  trace: Trace,
): Promise<Record<string, unknown>> {
  const prompt = buildKnowledgeAgentPrompt(options);
  const runOptions = {
    maxTurns: 100,
    session: options.session,
    sessionInputCallback: knowledgeAgentSessionInputCallback,
    sandbox: {
      client: options.sandboxClient,
      snapshot: {
        type: "local" as const,
        baseDir: options.sandboxWorkspace,
      },
      concurrencyLimits: {
        manifestEntries: 4,
        localDirFiles: 16,
      },
    },
  };
  if (options.onStreamEvent) {
    const result = await run(agent, prompt, { ...runOptions, stream: true });
    for await (const event of result) {
      for (const streamEvent of knowledgeAgentStreamEventsFromRunEvent(event)) {
        options.onStreamEvent({ ...streamEvent, source: "main" });
      }
    }
    await result.completed;
    for (const delta of chunkText(finalOutputText(result.finalOutput))) {
      options.onStreamEvent({
        type: "text_delta",
        delta,
        source: "main",
      });
    }
    return {
      result,
      trace: trace.toJSON(),
    };
  }

  const result = await run(agent, prompt, runOptions);
  return {
    result,
    trace: trace.toJSON(),
  };
}
