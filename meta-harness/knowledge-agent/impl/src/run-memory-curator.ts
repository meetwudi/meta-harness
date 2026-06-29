// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.library-scoped-memory-curator: runs a sequenced curator trace after the main agent.
// Supports knowledge-agent.provider-stream-events: streams Memory Curator model events after the main agent stream.

import { getGlobalTraceProvider, run, withTrace } from "@openai/agents";
import { RECOMMENDED_PROMPT_PREFIX } from "@openai/agents-core/extensions";
import { SandboxAgent } from "@openai/agents/sandbox";
import { buildKnowledgeAgentPrompt } from "./build-knowledge-agent-prompt.js";
import { buildManifest } from "./build-manifest.js";
import { createLibrarianOpenAITools } from "./create-librarian-openai-tools.js";
import { createMemoryCuratorLibrarianContext } from "./memory-curator-context.js";
import { createSandboxClient } from "./create-sandbox-client.js";
import { knowledgeAgentCapabilities } from "./knowledge-agent-capabilities.js";
import { knowledgeAgentStreamEventsFromRunEvent } from "./knowledge-agent-stream-events.js";
import { memoryCuratorRecentContext } from "./memory-curator-recent-context.js";
import { openAIReasoningSettings } from "./openai-reasoning-settings.js";
import { resultSummary } from "./result-summary.js";
import type { ProviderRunOptions } from "./types.js";

export type MemoryCuratorResult = {
  actorUri: string;
  trace: unknown;
  toolCallEvents: unknown[];
  summary: Record<string, unknown>;
};

/**
 * Runs Library-scoped memory curation after a main Knowledge Agent turn.
 */
export async function runMemoryCurator(
  options: ProviderRunOptions,
): Promise<MemoryCuratorResult | undefined> {
  if (!options.memoryCurator.enabled) {
    return undefined;
  }
  const actorUri = options.memoryCurator.actorUri as string;
  const recentMessageLimit = options.memoryCurator.recentMessageLimit as number;
  const curatorContext = createMemoryCuratorLibrarianContext(
    options.librarianContext,
    actorUri,
  );
  const recentContext = await memoryCuratorRecentContext(
    options.session,
    recentMessageLimit,
  );
  const prompt = buildMemoryCuratorPrompt({
    repoRoot: options.repoRoot,
    actorUri,
    recentMessageLimit,
    latestUserMessage: options.latestUserMessage,
    recentContext,
  });
  const agent = new SandboxAgent({
    name: "Meta Harness Memory Curator",
    model: options.model,
    modelSettings: {
      reasoning: openAIReasoningSettings(options.reasoningEffort),
    },
    instructions: [
      RECOMMENDED_PROMPT_PREFIX,
      "You are the Meta Harness Library-scoped Memory Curator.",
      "Follow the shared Knowledge Agent starter prompt in Memory Curator Mode.",
      "Before writing memory, inspect writable Libraries, LIBRARY.toml, MEMORY.toml, and existing memory.",
    ].join(" "),
    tools: createLibrarianOpenAITools(curatorContext),
    defaultManifest: buildManifest(options),
    capabilities: knowledgeAgentCapabilities(),
  });
  const tracedResult = await withTrace(
    `knowledge-agent-memory-curator:${options.conversationId}:${options.turnId}`,
    async (trace) => {
      const runOptions = {
        maxTurns: 12,
        sandbox: {
          client: createSandboxClient(options.client),
          snapshot: {
            type: "local",
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
            options.onStreamEvent({ ...streamEvent, source: "memory_curator" });
          }
        }
        await result.completed;
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
    },
    {
      metadata: {
        conversationId: options.conversationId,
        turnId: options.turnId,
        actorUri,
      },
    },
  );
  await getGlobalTraceProvider().forceFlush();
  return {
    actorUri,
    trace: tracedResult.trace,
    toolCallEvents: curatorContext.toolCallEvents,
    summary: resultSummary(tracedResult.result),
  };
}

/**
 * Builds the shared Knowledge Agent prompt in Memory Curator mode.
 */
export function buildMemoryCuratorPrompt(input: {
  repoRoot: string;
  actorUri: string;
  recentMessageLimit: number;
  latestUserMessage: string;
  recentContext: string;
}): string {
  return buildKnowledgeAgentPrompt({
    repoRoot: input.repoRoot,
    goal: "Curate Library-scoped Memory for the latest user message.",
    memoryCuratorMode: {
      actorUri: input.actorUri,
      recentMessageLimit: input.recentMessageLimit,
      latestUserMessageOnly: true,
      latestUserMessage: input.latestUserMessage,
      recentContext: input.recentContext,
    },
  });
}
