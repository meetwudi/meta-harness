// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.shared-tool-context: creates a shared context for all Librarian tools.
// Supports librarian.actor-protocol: enforces actor:// actor identities.
// Harness-Requirement: librarian.context-filters
// Harness-Requirement: librarian.actor-context-filters

import type {
  LibrarianContext,
  LibrarianContextFilters,
  LibrarianStorage,
  StorageLocation,
} from "./types.js";

/**
 * Creates the shared Librarian runtime context.
 */
export function createLibrarianContext(input: {
  storage: LibrarianStorage;
  storageLocations?: StorageLocation[];
  actorUri: string;
  actorUris?: string[];
  sessionId: string;
  contextFilters?: Partial<LibrarianContextFilters>;
}): LibrarianContext {
  const actorUris = [input.actorUri, ...(input.actorUris ?? [])]
    .filter((actorUri, index, values) => values.indexOf(actorUri) === index);
  for (const actorUri of actorUris) {
    if (!actorUri.startsWith("actor://")) {
      throw new Error(`Actor URI must use actor://: ${actorUri}`);
    }
  }
  const contextFilters = normalizeContextFilters(input.contextFilters);
  return {
    storage: input.storage,
    storageLocations: input.storageLocations ?? [],
    actorUri: input.actorUri,
    actorUris,
    sessionId: input.sessionId,
    contextFilters,
    toolCallEvents: [],
  };
}

function normalizeContextFilters(
  filters: Partial<LibrarianContextFilters> | undefined,
): LibrarianContextFilters {
  const actorUris = (filters?.actorUris ?? [])
    .map((actorUri) => actorUri.trim())
    .filter(Boolean)
    .filter((actorUri, index, values) => values.indexOf(actorUri) === index);
  for (const actorUri of actorUris) {
    if (!actorUri.startsWith("actor://")) {
      throw new Error(`Context filter actor URI must use actor://: ${actorUri}`);
    }
  }
  return { actorUris };
}
