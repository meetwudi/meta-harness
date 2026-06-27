// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.web-search-tool: exposes OpenAI hosted web search to eligible Knowledge Agent modes.

import { webSearchTool, type Tool } from "@openai/agents";

/**
 * Creates OpenAI hosted web search tools for current public information.
 */
export function createWebSearchOpenAITools(): Tool[] {
  return [
    webSearchTool({
      externalWebAccess: true,
      searchContextSize: "medium",
    }),
  ];
}
