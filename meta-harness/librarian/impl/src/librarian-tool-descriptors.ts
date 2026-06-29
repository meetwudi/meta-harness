// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.shamanistic-library-tools: describes Librarian tools exposed to agents.
// Supports librarian.tool-comments: gives each tool a concise description.
// Supports librarian.tool-descriptor-registry: derives the agent-facing Librarian tool registry from ToolSpecs.
// Supports librarian.toolspec-backed-agent-tools: derives tool descriptors from ToolSpec primitives.
// Supports librarian.tool-librarian-add-tags: describes the add Tags tool.
// Supports librarian.tool-librarian-remove-tags: describes the remove Tags tool.
// Supports librarian.tool-librarian-query-by-tags: describes the query by Tags tool.
// Supports librarian.tool-librarian-delete: describes the file/folder delete tool.

import { librarianToolSpecs } from "./librarian-toolspecs.js";
import type { LibrarianToolDescriptor } from "./types.js";

/**
 * Returns the Librarian tool descriptors exposed to an agent from ToolSpecs.
 */
export function librarianToolDescriptors(): LibrarianToolDescriptor[] {
  return librarianToolSpecs().map((toolSpec) => ({
    name: toolSpec.name,
    description: toolSpec.description,
    parameters: toolSpec.inputSchema,
  }));
}
