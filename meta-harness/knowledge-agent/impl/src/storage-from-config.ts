// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.storage-agnostic-runtime: selects the runtime storage implementation.

import { localFileSystemStorage } from "./local-file-system-storage.js";
import type { KnowledgeAgentStorage } from "./types.js";

/**
 * Selects the Knowledge Agent storage backend for the current runtime.
 */
export function storageFromConfig(): KnowledgeAgentStorage {
  return localFileSystemStorage();
}
