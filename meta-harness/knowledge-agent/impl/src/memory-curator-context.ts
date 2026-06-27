// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.library-scoped-memory-curator: creates curator-scoped Librarian context.

import type { LibrarianContext } from "../../../librarian/impl/dist/index.js";

/**
 * Creates a Memory Curator Librarian context with its own active actor and tool trace.
 */
export function createMemoryCuratorLibrarianContext(
  baseContext: LibrarianContext,
  actorUri: string,
): LibrarianContext {
  return {
    ...baseContext,
    actorUri,
    actorUris: [actorUri],
    toolCallEvents: [],
  };
}
