// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.conversation-state: exposes the validated conversation state callback tool.

import { tool, type Tool } from "@openai/agents";
import type { ConversationStateRuntime } from "./conversation-state.js";

/**
 * Creates the explicit callback tool agents use to update next-turn conversation state.
 */
export function createConversationStateOpenAITools(
  conversationState: ConversationStateRuntime,
): Tool[] {
  return [
    tool({
      name: "conversation_state_update",
      description: [
        "Callback for compact next-turn conversation state.",
        "Call when this turn creates, reads, updates, tags, queries, or otherwise mentions a Goal or Library that should remain available next turn.",
        "Use memoryCurationLibraries as a simple list of Library URIs that may need Memory Curator review for the latest user message; use [] or omit it when nothing should be curated.",
        "This routing does not replace direct Librarian memory writes when the user explicitly asks you to remember something.",
        "Only report references: mentionedGoals, mentionedLibraries, and memoryCurationLibraries entries contain uri only.",
        "Do not include Memory curation candidates, confidence, provenance, reasons, memory entries, or other curation payloads.",
        "Do not include Goal state, Library contents, focus, facts, mode, summaries, or invented fields.",
      ].join(" "),
      parameters: {
        type: "object",
        properties: {
          mentionedGoals: {
            type: "array",
            items: {
              type: "object",
              properties: {
                uri: { type: "string", pattern: "^library://" },
              },
              required: ["uri"],
              additionalProperties: false,
            },
          },
          mentionedLibraries: {
            type: "array",
            items: {
              type: "object",
              properties: {
                uri: { type: "string", pattern: "^library://" },
              },
              required: ["uri"],
              additionalProperties: false,
            },
          },
          memoryCurationLibraries: {
            type: "array",
            items: {
              type: "object",
              properties: {
                uri: { type: "string", pattern: "^library://" },
              },
              required: ["uri"],
              additionalProperties: false,
            },
          },
        },
        additionalProperties: false,
      } as never,
      strict: false,
      execute: async (input: unknown) =>
        conversationState.update(objectInput(input) as Parameters<ConversationStateRuntime["update"]>[0]),
    }),
  ];
}

function objectInput(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("conversation_state_update input must be an object.");
  }
  return input as Record<string, unknown>;
}
