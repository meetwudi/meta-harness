// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.uses-librarian: creates the Librarian context consumed by Knowledge Agent.
// Supports knowledge-agent.library-index-only-agent-input: keeps Library index paths in hidden tool context.

import {
  createLibrarianContext,
  createLocalFileSystemStorage,
} from "../../../librarian/impl/dist/index.js";
import { resolveUnderRepo } from "./resolve-under-repo.js";
import type { PreparedRuntime } from "./types.js";

/**
 * Creates the local Librarian context for one Knowledge Agent conversation.
 */
export function createLocalLibrarianContext(
  input: { repoRootPath: string; libraryIndex: string; conversationId: string },
  runtime: PreparedRuntime,
) {
  const libraryIndexPath = resolveUnderRepo(input.repoRootPath, input.libraryIndex);
  return createLibrarianContext({
    storage: createLocalFileSystemStorage(),
    libraryIndexPaths: [
      libraryIndexPath,
      runtime.runtimeLibraryIndex,
    ],
    libraryIndexBasePaths: {
      [libraryIndexPath]: input.repoRootPath,
    },
    actorUri: "actor://knowledge-agent",
    sessionId: input.conversationId,
  });
}
