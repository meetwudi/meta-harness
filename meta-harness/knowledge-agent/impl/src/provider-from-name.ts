// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.provider-interface: selects a provider implementation behind a clean interface.

import { DEFAULT_MODEL } from "./constants.js";
import { assertOpenAIReady } from "./assert-openai-ready.js";
import { runOpenAIConversation } from "./run-openai-conversation.js";
import type { KnowledgeAgentProvider } from "./types.js";

/**
 * Resolves a provider name to the Knowledge Agent provider implementation.
 */
export function providerFromName(name: string): KnowledgeAgentProvider {
  if (name === "openai") {
    return {
      name: "openai",
      defaultModel: DEFAULT_MODEL,
      assertReady: assertOpenAIReady,
      runConversation: runOpenAIConversation,
    };
  }
  throw new Error(`unknown provider: ${name}`);
}
