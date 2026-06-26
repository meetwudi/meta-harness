// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.openai-reasoning-effort: validates configured reasoning effort.

import { DEFAULT_REASONING_EFFORT } from "./constants.js";
import type { ReasoningEffort } from "./types.js";

const reasoningEfforts = [
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
] as const;

/**
 * Parses and validates a reasoning effort string.
 */
export function parseReasoningEffort(value: string | undefined): ReasoningEffort {
  const normalized = (value ?? DEFAULT_REASONING_EFFORT).trim();
  if (isReasoningEffort(normalized)) {
    return normalized;
  }
  throw new Error(
    `invalid reasoning effort: ${value}. Expected one of ${reasoningEfforts.join(", ")}`,
  );
}

function isReasoningEffort(value: string): value is ReasoningEffort {
  return reasoningEfforts.some((effort) => effort === value);
}
