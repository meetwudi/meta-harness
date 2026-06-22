// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.storage-agnostic-runtime: adapts local filesystem persistence to the storage interface.
// Supports knowledge-agent.library-writes-memory: provides local writable Libraries through Librarian.
// Supports knowledge-agent.openai-trace-conversation-history: provides local conversation history storage.
// Supports knowledge-agent.uses-librarian: creates Librarian context for local storage.

import { createLocalLibrarianContext } from "./create-local-librarian-context.js";
import { LocalJsonlSession } from "./local-jsonl-session.js";
import { prepareLocalRuntime } from "./prepare-local-runtime.js";
import { recordLocalHistory } from "./record-local-history.js";
import type { KnowledgeAgentStorage } from "./types.js";

/**
 * Creates the local filesystem Knowledge Agent storage implementation.
 */
export function localFileSystemStorage(): KnowledgeAgentStorage {
  return {
    prepareRuntime: prepareLocalRuntime,
    createLibrarianContext: createLocalLibrarianContext,
    createSession: (runtime, conversationId) =>
      new LocalJsonlSession(conversationId, runtime.sessionFile),
    recordConversation: recordLocalHistory,
  };
}
