// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.postgres-runtime-storage: stores Knowledge Agent runtime state in Postgres.
// Supports knowledge-agent.storage-agnostic-runtime: implements the KnowledgeAgentStorage interface with a database runtime store.
// Harness-Requirement: knowledge-agent.postgres-runtime-storage

import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  createPostgresStorageFromConnectionString,
  type PostgresStorage,
} from "../../../librarian/impl/dist/index.js";
import { createLocalLibrarianContext } from "./create-local-librarian-context.js";
import { ensureConversationsLibrary } from "./ensure-conversations-library.js";
import { ensureMemoryLibrary } from "./ensure-memory-library.js";
import { LocalJsonlSession } from "./local-jsonl-session.js";
import { recordLocalHistory } from "./record-local-history.js";
import { resolveLocalRoot } from "./resolve-local-root.js";
import { resolveRuntimeLibraryRootPath } from "./runtime-library-path.js";
import type { KnowledgeAgentStorage, StoragePrepareInput } from "./types.js";

export type PostgresKnowledgeAgentStorageOptions = {
  connectionString: string;
  schemaName?: string;
  tableName?: string;
  autoEnsureSchema?: boolean;
};

/**
 * Creates a Knowledge Agent runtime storage implementation backed by Postgres.
 */
export function postgresKnowledgeAgentStorage(
  options: PostgresKnowledgeAgentStorageOptions,
): KnowledgeAgentStorage {
  const runtimeStorage = createPostgresStorageFromConnectionString(options);
  return {
    prepareRuntime: (input) => preparePostgresRuntime(input, runtimeStorage),
    createLibrarianContext: createLocalLibrarianContext,
    createSession: (runtime, conversationId) =>
      new LocalJsonlSession(conversationId, runtime.runtimeStorage, runtime.sessionFile),
    recordConversation: recordLocalHistory,
  };
}

async function preparePostgresRuntime(
  input: StoragePrepareInput,
  runtimeStorage: PostgresStorage,
) {
  const {
    repoRootPath,
    configuredLocalRoot,
    sandboxWorkspaceInput,
    conversationId,
  } = input;
  const localRoot = resolveLocalRoot(repoRootPath, configuredLocalRoot);
  const tmpStorageLibrariesRoot = "/libraries";
  const pathValues = {
    repoRootPath,
    projectRootPath: input.projectRootPath,
    localRoot,
    tmpStorageLibrariesRoot,
  };
  const conversationsLibrary = resolveRuntimeLibraryRootPath(
    input.conversationLibrary.rootPath,
    pathValues,
  );
  const memoryLibrary = input.sharedMemory.library
    ? resolveRuntimeLibraryRootPath(input.sharedMemory.library.rootPath, pathValues)
    : "";
  const conversationRoot = join(conversationsLibrary, conversationId);
  const sessionFile = join(conversationRoot, "session.jsonl");
  const sandboxWorkspace = resolve(
    repoRootPath,
    sandboxWorkspaceInput || join(localRoot, "knowledge-agent", "sandbox-workspaces", conversationId),
  );
  await runtimeStorage.ensureSchema();
  await ensureConversationsLibrary(
    runtimeStorage,
    conversationsLibrary,
    input.conversationLibrary.name,
    input.actorUri,
  );
  if (input.sharedMemory.enabled) {
    if (!input.sharedMemory.library) {
      throw new Error(".meta-harness.json runtime.sharedMemory.library is required when shared memory is enabled");
    }
    await ensureMemoryLibrary(
      runtimeStorage,
      memoryLibrary,
      input.sharedMemory.library.name,
      input.actorUri,
    );
  }
  await runtimeStorage.makeDirectory(conversationRoot);
  await mkdir(sandboxWorkspace, { recursive: true });
  return {
    localRoot,
    conversationsLibrary,
    memoryLibrary,
    memoryCurator: input.memoryCurator,
    conversationRoot,
    sessionFile,
    tmpStorageLibrariesRoot,
    sandboxWorkspace,
    runtimeStorage,
  };
}
