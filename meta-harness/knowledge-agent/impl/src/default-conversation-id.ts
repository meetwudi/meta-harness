// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.openai-trace-conversation-history: names conversation memory with sortable timestamps.

import { randomUUID } from "node:crypto";

/**
 * Builds a sortable default conversation id from the current timestamp and a UUID.
 */
export function defaultConversationId(now: Date = new Date()): string {
  const timestamp = now.toISOString().replace(/[-:]/g, "").replace(".", "-");
  return `${timestamp}-${randomUUID()}`;
}
