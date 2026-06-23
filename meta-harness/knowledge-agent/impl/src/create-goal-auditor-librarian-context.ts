// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.goal-auditor-agent: gives Goal Auditor agents an independent actor identity.

import type { LibrarianContext } from "../../../librarian/impl/dist/index.js";

/**
 * Creates a Goal Auditor Librarian context that shares conversation trace events.
 */
export function createGoalAuditorLibrarianContext(
  baseContext: LibrarianContext,
  auditorActorUri: string,
): LibrarianContext {
  const actorUris = [
    baseContext.actorUri,
    ...baseContext.actorUris,
    auditorActorUri,
  ].filter((actorUri, index, values) => values.indexOf(actorUri) === index);

  return {
    ...baseContext,
    actorUri: auditorActorUri,
    actorUris,
    toolCallEvents: baseContext.toolCallEvents,
  };
}
