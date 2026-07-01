// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.library-writes-memory: prepares local writable Libraries for Librarian.
// Supports knowledge-agent.openai-trace-conversation-history: prepares configured conversation storage.
// Supports knowledge-agent.storage-discovery-runtime: keeps local Library path setup outside main agent inputs.
// Supports knowledge-agent.storage-agnostic-runtime: implements the local filesystem storage preparation.

import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createLocalFileSystemStorage } from "../../../librarian/impl/dist/index.js";
import { ensureConversationsLibrary } from "./ensure-conversations-library.js";
import { ensureMemoryLibrary } from "./ensure-memory-library.js";
import { resolveLocalRoot } from "./resolve-local-root.js";
import { resolveRuntimeLibraryRootPath } from "./runtime-library-path.js";
import type { PreparedRuntime, StoragePrepareInput } from "./types.js";

/**
 * Prepares host-local Knowledge Agent folders.
 */
export async function prepareLocalRuntime(
  input: StoragePrepareInput,
): Promise<PreparedRuntime> {
  const {
    repoRootPath,
    configuredLocalRoot,
    sandboxWorkspaceInput,
    conversationId,
  } = input;
  const localRoot = resolveLocalRoot(repoRootPath, configuredLocalRoot);
  const knowledgeAgentRoot = join(localRoot, "knowledge-agent");
  const tmpStorageRoot = resolve(
    repoRootPath,
    join(knowledgeAgentRoot, "tmp-local-storage"),
  );
  const tmpStorageLibrariesRoot = join(tmpStorageRoot, "libraries");
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
    sandboxWorkspaceInput || join(knowledgeAgentRoot, "sandbox-workspaces", conversationId),
  );
  const runtimeStorage = createLocalFileSystemStorage();
  await ensureConversationsLibrary(
    runtimeStorage,
    conversationsLibrary,
    input.conversationLibrary.name,
    input.defaultReadActors ?? [input.actorUri],
    input.defaultUpdateActors ?? [],
  );
  if (input.sharedMemory.enabled) {
    if (!input.sharedMemory.library) {
      throw new Error(".meta-harness.json runtime.sharedMemory.library is required when shared memory is enabled");
    }
    await ensureMemoryLibrary(
      runtimeStorage,
      memoryLibrary,
      input.sharedMemory.library.name,
      input.defaultReadActors ?? [input.actorUri],
      input.defaultUpdateActors ?? [input.actorUri],
    );
  }
  await mkdir(conversationRoot, { recursive: true });
  await mkdir(sandboxWorkspace, { recursive: true });
  const runtime = {
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
  return runtime;
}
