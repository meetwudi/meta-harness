// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.library-scoped-memory-curator: bounds curation context to recent messages.

import type { AgentInputItem } from "@openai/agents";
import type { KnowledgeAgentSession } from "./local-jsonl-session.js";

/**
 * Reads a bounded, JSON-safe recent session context for the Memory Curator.
 */
export async function memoryCuratorRecentContext(
  session: KnowledgeAgentSession,
  limit: number,
): Promise<string> {
  const items = await session.getItems(limit);
  return JSON.stringify(items.map(compactSessionItem), null, 2);
}

function compactSessionItem(item: AgentInputItem): Record<string, unknown> {
  if (typeof item !== "object" || item === null) {
    return { value: String(item) };
  }
  const record = item as Record<string, unknown>;
  const compact: Record<string, unknown> = {};
  for (const key of ["type", "role", "name", "status"]) {
    if (typeof record[key] === "string") {
      compact[key] = record[key];
    }
  }
  if (typeof record.content === "string") {
    compact.content = record.content.slice(0, 4000);
  } else if (Array.isArray(record.content)) {
    compact.content = record.content
      .map((part) => summarizeContentPart(part))
      .filter((part) => part !== undefined);
  }
  if (typeof record.output === "string") {
    compact.output = record.output.slice(0, 4000);
  }
  return compact;
}

function summarizeContentPart(part: unknown): Record<string, unknown> | undefined {
  if (typeof part !== "object" || part === null) {
    return undefined;
  }
  const record = part as Record<string, unknown>;
  const summary: Record<string, unknown> = {};
  if (typeof record.type === "string") {
    summary.type = record.type;
  }
  if (typeof record.text === "string") {
    summary.text = record.text.slice(0, 4000);
  }
  return Object.keys(summary).length ? summary : undefined;
}
