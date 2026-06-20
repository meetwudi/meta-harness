// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.uses-librarian: exposes Librarian operations to the OpenAI agent.
// Supports knowledge-agent.library-scoped-access: routes Library access through scoped Librarian tools.
// Supports librarian.tool-comments: preserves Librarian tool descriptions for the agent.

import { tool, type Tool } from "@openai/agents";
import {
  executeLibrarianTool,
  librarianToolDescriptors,
  type LibrarianContext,
} from "../../../librarian/impl/dist/index.js";

/**
 * Converts Librarian tool descriptors into OpenAI Agents SDK function tools.
 */
export function createLibrarianOpenAITools(
  context: LibrarianContext,
): Tool[] {
  return librarianToolDescriptors().map((descriptor) =>
    tool({
      name: descriptor.name,
      description: descriptor.description,
      parameters: descriptor.parameters as never,
      strict: false,
      execute: async (input: unknown) =>
        executeLibrarianTool(
          context,
          descriptor.name,
          input && typeof input === "object"
            ? (input as Record<string, unknown>)
            : {},
        ),
    }),
  );
}
