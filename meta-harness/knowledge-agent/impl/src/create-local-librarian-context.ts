// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.uses-librarian: creates the Librarian context consumed by Knowledge Agent.
// Supports knowledge-agent.storage-discovery-runtime: keeps storage discovery in hidden tool context.
// Supports storage.storage-location-knowledge: loads storage locations from structured knowledge.

import {
  createLibrarianContext,
  createLocalFileSystemStorage,
} from "../../../librarian/impl/dist/index.js";
import { loadLocalStorageLocations } from "./load-local-storage-locations.js";
import type { PreparedRuntime } from "./types.js";

/**
 * Creates the local Librarian context for one Knowledge Agent conversation.
 */
export function createLocalLibrarianContext(
  input: { repoRootPath: string; conversationId: string },
  runtime: PreparedRuntime,
) {
  const storage = createLocalFileSystemStorage();
  return createLibrarianContext({
    storage,
    storageLocations: loadLocalStorageLocations({
      repoRootPath: input.repoRootPath,
      runtime,
      storage,
    }),
    actorUri: "actor://knowledge-agent",
    sessionId: input.conversationId,
  });
}
