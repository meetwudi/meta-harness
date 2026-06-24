// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.conversation-state: removes stale generated prompt state from model-visible session history.

import type { AgentInputItem } from "@openai/agents";

const KNOWLEDGE_AGENT_PROMPT_PREFIX = "# Knowledge Agent\n\n";
const USER_REQUEST_MARKER = "\n## User Request\n\n";

/**
 * Keeps generated conversation state replaceable by compacting older Knowledge Agent
 * prompt inputs to their user request before the model sees session history.
 */
export function knowledgeAgentSessionInputCallback(
  historyItems: AgentInputItem[],
  newItems: AgentInputItem[],
): AgentInputItem[] {
  return [
    ...historyItems.map(compactKnowledgeAgentPromptItem),
    ...newItems,
  ];
}

function compactKnowledgeAgentPromptItem(item: AgentInputItem): AgentInputItem {
  const content = userMessageStringContent(item);
  if (content === undefined) {
    return item;
  }
  if (!content.startsWith(KNOWLEDGE_AGENT_PROMPT_PREFIX)) {
    return item;
  }
  const markerIndex = content.indexOf(USER_REQUEST_MARKER);
  if (markerIndex < 0) {
    return item;
  }
  const userRequest = content.slice(markerIndex + USER_REQUEST_MARKER.length).trim();
  return {
    ...item,
    content: `Previous user request:\n\n${userRequest}`,
  } as AgentInputItem;
}

function userMessageStringContent(
  item: AgentInputItem,
): string | undefined {
  if (typeof item !== "object" || item === null) {
    return undefined;
  }
  const record = item as Record<string, unknown>;
  if (record.type !== "message" || record.role !== "user") {
    return undefined;
  }
  return typeof record.content === "string" ? record.content : undefined;
}
