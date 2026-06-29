// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.provider-stream-events: converts provider stream events into public progress, reasoning, and text deltas.

import type { RunStreamEvent } from "@openai/agents";
import type { KnowledgeAgentStreamEvent } from "./types.js";

function objectRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function eventName(value: unknown): string {
  return stringValue(objectRecord(value).name);
}

function agentName(value: unknown): string {
  return stringValue(objectRecord(value).name) || "Knowledge Agent";
}

function itemRecord(value: unknown): Record<string, unknown> {
  const maybeJson = objectRecord(value) as { toJSON?: unknown };
  if (typeof maybeJson.toJSON === "function") {
    return objectRecord(maybeJson.toJSON());
  }
  return objectRecord(value);
}

function rawItemRecord(value: unknown): Record<string, unknown> {
  return objectRecord(itemRecord(value).rawItem);
}

function toolName(rawItem: Record<string, unknown>): string {
  return (
    stringValue(rawItem.name)
    || stringValue(rawItem.type)
    || "tool"
  );
}

function progress(message: string): KnowledgeAgentStreamEvent[] {
  return [{ type: "progress", message }];
}

function humanizeIdentifier(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function progressFromToolCall(tool: string): KnowledgeAgentStreamEvent[] {
  if (!tool) {
    return progress("Using a configured tool.");
  }
  if (tool.startsWith("librarian_")) {
    return progress("Reading governed knowledge.");
  }
  if (tool === "conversation_state_update") {
    return progress("Updating conversation context.");
  }
  if (tool.startsWith("goal_")) {
    return progress("Working with goal records.");
  }
  if (tool.startsWith("routine_")) {
    return progress("Working with routine knowledge.");
  }
  if (tool.includes("web_search") || tool.includes("search")) {
    return progress("Searching public sources.");
  }
  if (tool === "fetch_youtube_transcript") {
    return progress("Fetching a YouTube transcript.");
  }

  return progress(`Using ${humanizeIdentifier(tool)}.`);
}

function modelEventFromRaw(rawEvent: Record<string, unknown>): Record<string, unknown> {
  const data = objectRecord(rawEvent.data);
  const nested = objectRecord(data.event);
  return nested.type ? nested : data;
}

function reasoningDeltaFromModelEvent(
  modelEvent: Record<string, unknown>,
): KnowledgeAgentStreamEvent[] {
  const type = stringValue(modelEvent.type);
  const delta = stringValue(modelEvent.delta);
  if (type === "response.reasoning_summary_text.delta" && delta) {
    return [{ type: "reasoning_delta", delta }];
  }
  return [];
}

function eventsFromRunItem(
  name: string,
  item: unknown,
): KnowledgeAgentStreamEvent[] {
  const rawItem = rawItemRecord(item);
  const nameSuffix = toolName(rawItem);

  switch (name) {
    case "tool_called":
      return progressFromToolCall(nameSuffix);
    case "tool_output":
      return [];
    case "tool_search_called":
      return progress("Searching public sources.");
    case "tool_search_output_created":
      return [];
    case "handoff_requested":
      return progress("Preparing a specialized agent handoff.");
    case "handoff_occurred":
      return progress("Working with a specialized agent.");
    case "reasoning_item_created":
      return [];
    case "message_output_created":
      return [];
    default:
      return [];
  }
}

export function knowledgeAgentStreamEventsFromRunEvent(
  event: RunStreamEvent,
): KnowledgeAgentStreamEvent[] {
  const record = objectRecord(event);
  const type = stringValue(record.type);

  if (type === "agent_updated_stream_event") {
    const name = agentName(record.agent);
    return name.includes("Memory Curator")
      ? progress("Reviewing memory.")
      : progress("Working on the request.");
  }

  if (type === "run_item_stream_event") {
    return eventsFromRunItem(eventName(event), record.item);
  }

  if (type === "raw_model_stream_event") {
    const modelEvent = modelEventFromRaw(record);
    return reasoningDeltaFromModelEvent(modelEvent);
  }

  return [];
}
