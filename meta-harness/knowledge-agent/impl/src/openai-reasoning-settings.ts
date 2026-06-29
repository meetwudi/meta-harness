// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.openai-reasoning-effort: centralizes OpenAI reasoning effort settings.
// Supports knowledge-agent.provider-stream-events: requests safe reasoning summaries for streamed model-origin reasoning.

import type { ModelSettings } from "@openai/agents-core";
import type { ReasoningEffort } from "./types.js";

/**
 * Builds OpenAI reasoning settings for Knowledge Agent and sequenced agent runs.
 */
export function openAIReasoningSettings(
  reasoningEffort: ReasoningEffort,
): NonNullable<ModelSettings["reasoning"]> {
  if (reasoningEffort === "none") {
    return { effort: reasoningEffort };
  }

  return {
    effort: reasoningEffort,
    summary: "auto",
  };
}
