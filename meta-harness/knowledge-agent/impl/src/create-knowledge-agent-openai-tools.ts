// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.agent-tool-assembly: assembles the primary Knowledge Agent tool surface.
// Supports knowledge-agent.web-search-tool: includes hosted web search in the primary Knowledge Agent session.

import type { Tool } from "@openai/agents";
import type { LibrarianContext } from "../../../librarian/impl/dist/index.js";
import type { ConversationStateRuntime } from "./conversation-state.js";
import { createConversationStateOpenAITools } from "./create-conversation-state-openai-tools.js";
import { createGoalOpenAITools } from "./create-goal-openai-tools.js";
import { createLibrarianOpenAITools } from "./create-librarian-openai-tools.js";
import { createWebSearchOpenAITools } from "./create-web-search-openai-tools.js";

/**
 * Assembles tools exposed to the primary Knowledge Agent session.
 */
export function createKnowledgeAgentOpenAITools(input: {
  conversationState: ConversationStateRuntime;
  librarianContext: LibrarianContext;
}): Tool[] {
  return [
    ...createConversationStateOpenAITools(input.conversationState),
    ...createLibrarianOpenAITools(input.librarianContext),
    ...createGoalOpenAITools(input.librarianContext),
    ...createWebSearchOpenAITools(),
  ];
}
