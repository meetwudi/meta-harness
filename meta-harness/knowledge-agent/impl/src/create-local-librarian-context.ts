// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.uses-librarian: creates the Librarian context consumed by Knowledge Agent.
// Supports knowledge-agent.storage-discovery-runtime: keeps storage discovery in hidden tool context.
// Supports knowledge-agent.project-config-selection: passes selected project config into storage discovery.
// Supports storage.storage-location-knowledge: loads storage locations from structured knowledge.
// Harness-Requirement: knowledge-agent.project-config-selection
// Harness-Requirement: storage.project-scoped-storage-locations

import {
  createLibrarianContext,
  createLocalFileSystemStorage,
} from "../../../librarian/impl/dist/index.js";
import { loadLocalStorageLocations } from "./load-local-storage-locations.js";
import {
  loadMetaHarnessConfig,
  resolveProjectActorUri,
} from "./load-meta-harness-config.js";
import { resolveRuntimeActorContext } from "./runtime-actor-context.js";
import type { PreparedRuntime } from "./types.js";

/**
 * Creates the local Librarian context for one Knowledge Agent conversation.
 */
export function createLocalLibrarianContext(
  input: { repoRootPath: string; projectConfigPath: string; conversationId: string },
  runtime: PreparedRuntime,
) {
  const storage = createLocalFileSystemStorage();
  const projectActorUri = resolveProjectActorUri(
    loadMetaHarnessConfig(input.repoRootPath, input.projectConfigPath),
  );
  const actorContext = resolveRuntimeActorContext(projectActorUri);
  return createLibrarianContext({
    storage,
    storageLocations: loadLocalStorageLocations({
      repoRootPath: input.repoRootPath,
      projectConfigPath: input.projectConfigPath,
      runtime,
      storage,
      actorUris: actorContext.actorUris,
      defaultReadActors: actorContext.defaultReadActors,
      defaultUpdateActors: actorContext.defaultUpdateActors,
    }),
    actorUri: actorContext.actorUri,
    actorUris: actorContext.actorUris,
    sessionId: input.conversationId,
  });
}
