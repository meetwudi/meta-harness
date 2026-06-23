// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.routine-handoffs: uses the Routine actor identity for Routine handoff agents.

import type { LibrarianContext } from "../../../librarian/impl/dist/index.js";

/**
 * Creates a Routine-scoped Librarian context that shares conversation trace events.
 */
export function createRoutineLibrarianContext(
  baseContext: LibrarianContext,
  routineActorUri: string,
): LibrarianContext {
  const actorUris = [
    baseContext.actorUri,
    ...baseContext.actorUris,
    routineActorUri,
  ].filter((actorUri, index, values) => values.indexOf(actorUri) === index);

  return {
    ...baseContext,
    actorUri: routineActorUri,
    actorUris,
    toolCallEvents: baseContext.toolCallEvents,
  };
}
