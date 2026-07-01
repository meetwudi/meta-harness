// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.storage-agnostic-runtime: selects the runtime storage implementation.
// Supports knowledge-agent.postgres-runtime-storage: selects Postgres for configured runtime state.

import { localFileSystemStorage } from "./local-file-system-storage.js";
import { postgresKnowledgeAgentStorage } from "./postgres-knowledge-agent-storage.js";
import {
  resolveProjectActorUri,
  type MetaHarnessConfig,
} from "./load-meta-harness-config.js";
import { resolveRuntimeActorContext } from "./runtime-actor-context.js";
import type { KnowledgeAgentStorage } from "./types.js";

/**
 * Selects the Knowledge Agent storage backend for the current runtime.
 */
export function storageFromConfig(config?: MetaHarnessConfig): KnowledgeAgentStorage {
  const runtimeStorage = config?.runtime?.conversationStorage;
  if (runtimeStorage?.driverName === "postgres") {
    const actorContext = resolveRuntimeActorContext(resolveProjectActorUri(config));
    const envName = runtimeStorage.connectionStringEnv ?? "META_HARNESS_POSTGRES_URL";
    const connectionString = process.env[envName];
    if (!connectionString) {
      throw new Error(`Postgres runtime storage requires environment variable: ${envName}`);
    }
    return postgresKnowledgeAgentStorage({
      connectionString,
      schemaName: runtimeStorage.schemaName,
      tableName: runtimeStorage.tableName,
      autoEnsureSchema: runtimeStorage.autoEnsureSchema,
      actorUris: actorContext.actorUris,
      defaultReadActors: actorContext.defaultReadActors,
      defaultUpdateActors: actorContext.defaultUpdateActors,
    });
  }
  return localFileSystemStorage();
}
