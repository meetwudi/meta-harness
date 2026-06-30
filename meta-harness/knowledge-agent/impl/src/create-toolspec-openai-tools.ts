// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.library-toolspec-openai-tools: exposes allowed Library ToolSpecs as OpenAI tools.
// Compliance: keep this adapter generic; do not branch here on specific tool names, implementation tokens, or implementation file names.

import { tool, type Tool } from "@openai/agents";
import {
  discoverLibraryToolSpecs,
  toolSpecAllowsActor,
  type LibrarianContext,
} from "../../../librarian/impl/dist/index.js";
import { executeToolSpecImplementation } from "./resolve-toolspec-implementation.js";

/**
 * Creates OpenAI tools from allowed ToolSpecs discovered in readable Libraries.
 */
export async function createToolSpecOpenAITools(input: {
  librarianContext: LibrarianContext;
  reservedToolNames: Set<string>;
}): Promise<Tool[]> {
  const toolSpecs = await discoverLibraryToolSpecs(input.librarianContext);
  const tools: Tool[] = [];
  for (const toolSpec of toolSpecs) {
    if (input.reservedToolNames.has(toolSpec.name)) {
      continue;
    }
    if (!toolSpecAllowsActor(toolSpec, input.librarianContext.actorUris)) {
      continue;
    }
    input.reservedToolNames.add(toolSpec.name);
    tools.push(tool({
      name: toolSpec.name,
      description: toolSpec.description,
      parameters: toolSpec.inputSchema as never,
      strict: false,
      execute: async (rawInput: unknown) =>
        executeToolSpecImplementation(
          toolSpec,
          rawInput && typeof rawInput === "object"
            ? rawInput as Record<string, unknown>
            : {},
        ),
    }));
  }
  return tools;
}
