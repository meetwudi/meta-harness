// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.agent-tool-assembly: assembles the primary Knowledge Agent tool surface.
// Supports knowledge-agent.web-search-tool: includes hosted web search in the primary Knowledge Agent session.
// Supports knowledge-agent.library-toolspec-openai-tools: includes allowed tools discovered from Library ToolSpecs.

import type { Tool } from "@openai/agents";
import type { LibrarianContext } from "../../../librarian/impl/dist/index.js";
import type { ConversationStateRuntime } from "./conversation-state.js";
import { createConversationStateOpenAITools } from "./create-conversation-state-openai-tools.js";
import { createGoalOpenAITools } from "./create-goal-openai-tools.js";
import { createLibrarianOpenAITools } from "./create-librarian-openai-tools.js";
import { createToolSpecOpenAITools } from "./create-toolspec-openai-tools.js";
import { createWebSearchOpenAITools } from "./create-web-search-openai-tools.js";

/**
 * Assembles tools exposed to the primary Knowledge Agent session.
 */
export async function createKnowledgeAgentOpenAITools(input: {
  conversationState: ConversationStateRuntime;
  librarianContext: LibrarianContext;
}): Promise<Tool[]> {
  const builtInTools = [
    ...createConversationStateOpenAITools(input.conversationState),
    ...createLibrarianOpenAITools(input.librarianContext),
    ...createGoalOpenAITools(input.librarianContext),
    ...createWebSearchOpenAITools(),
  ];
  const reservedToolNames = new Set(builtInTools.map((tool) => tool.name));
  return [
    ...builtInTools,
    ...await createToolSpecOpenAITools({
      librarianContext: input.librarianContext,
      reservedToolNames,
    }),
  ];
}
