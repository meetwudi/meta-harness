// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.task-handoffs: runs task handoff agents with task-scoped actor identity.

import type { LibrarianContext } from "../../../librarian/impl/dist/index.js";

/**
 * Creates a task-scoped Librarian context that shares conversation trace events.
 */
export function createTaskLibrarianContext(
  baseContext: LibrarianContext,
  taskActorUri: string,
): LibrarianContext {
  const actorUris = [
    baseContext.actorUri,
    ...baseContext.actorUris,
    taskActorUri,
  ].filter((actorUri, index, values) => values.indexOf(actorUri) === index);

  return {
    ...baseContext,
    actorUri: taskActorUri,
    actorUris,
    toolCallEvents: baseContext.toolCallEvents,
  };
}
