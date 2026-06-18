// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.storage-agnostic-runtime: adapts local filesystem persistence to the storage interface.
// Supports knowledge-agent.library-writes-memory: provides local writable Library staging and sync-back.
// Supports knowledge-agent.openai-trace-conversation-history: provides local conversation history storage.

import { prepareLocalRuntime } from "./prepare-local-runtime.js";
import { recordLocalHistory } from "./record-local-history.js";
import { syncSandboxLibraries } from "./sync-sandbox-libraries.js";
import type { KnowledgeAgentStorage } from "./types.js";

/**
 * Creates the local filesystem Knowledge Agent storage implementation.
 */
export function localFileSystemStorage(): KnowledgeAgentStorage {
  return {
    prepareRuntime: prepareLocalRuntime,
    syncFromSandbox: syncSandboxLibraries,
    recordConversation: recordLocalHistory,
  };
}
