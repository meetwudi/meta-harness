// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.shared-tool-context: creates a shared context for all Librarian tools.
// Supports librarian.actor-protocol: enforces actor:// actor identities.

import type { LibrarianContext, LibrarianStorage } from "./types.js";

/**
 * Creates the shared Librarian runtime context.
 */
export function createLibrarianContext(input: {
  storage: LibrarianStorage;
  libraryIndexPaths: string[];
  libraryIndexBasePaths?: Record<string, string>;
  actorUri: string;
  sessionId: string;
}): LibrarianContext {
  if (!input.actorUri.startsWith("actor://")) {
    throw new Error(`Actor URI must use actor://: ${input.actorUri}`);
  }
  return {
    storage: input.storage,
    libraryIndexPaths: input.libraryIndexPaths,
    libraryIndexBasePaths: input.libraryIndexBasePaths,
    actorUri: input.actorUri,
    sessionId: input.sessionId,
    toolCallEvents: [],
  };
}
