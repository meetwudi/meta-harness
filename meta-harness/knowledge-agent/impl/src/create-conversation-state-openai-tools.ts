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
        "Only report references: mentionedGoals and mentionedLibraries entries contain uri only.",
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
  return input && typeof input === "object" ? input as Record<string, unknown> : {};
}
