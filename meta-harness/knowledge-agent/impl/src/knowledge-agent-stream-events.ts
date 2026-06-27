// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.provider-stream-events: converts provider stream events into public progress summaries.

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

function modelEventFromRaw(rawEvent: Record<string, unknown>): Record<string, unknown> {
  const data = objectRecord(rawEvent.data);
  const nested = objectRecord(data.event);
  return nested.type ? nested : data;
}

function textDeltaFromModelEvent(
  modelEvent: Record<string, unknown>,
): KnowledgeAgentStreamEvent[] {
  const type = stringValue(modelEvent.type);
  const delta = stringValue(modelEvent.delta);
  if ((type === "output_text_delta" || type === "response.output_text.delta") && delta) {
    return [{ type: "text_delta", delta }];
  }
  return [];
}

function progressFromModelEvent(
  modelEvent: Record<string, unknown>,
): KnowledgeAgentStreamEvent[] {
  const type = stringValue(modelEvent.type);
  if (type === "response_started" || type === "response.created") {
    return progress("Model response started.");
  }
  if (type === "response_done" || type === "response.completed") {
    return progress("Model response completed.");
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
      return progress(`Tool called: ${nameSuffix}.`);
    case "tool_output":
      return progress(`Tool output received: ${nameSuffix}.`);
    case "tool_search_called":
      return progress("Search tool called.");
    case "tool_search_output_created":
      return progress("Search results received.");
    case "handoff_requested":
      return progress("Agent handoff requested.");
    case "handoff_occurred":
      return progress("Agent handoff occurred.");
    case "reasoning_item_created":
      return progress("Reasoning checkpoint recorded.");
    case "message_output_created":
      return progress("Assistant message created.");
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
    return progress(`Active agent: ${agentName(record.agent)}.`);
  }

  if (type === "run_item_stream_event") {
    return eventsFromRunItem(eventName(event), record.item);
  }

  if (type === "raw_model_stream_event") {
    const modelEvent = modelEventFromRaw(record);
    return [
      ...progressFromModelEvent(modelEvent),
      ...textDeltaFromModelEvent(modelEvent),
    ];
  }

  return [];
}
