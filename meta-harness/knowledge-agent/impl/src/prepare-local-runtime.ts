// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.library-writes-memory: prepares local writable Libraries for sandbox staging.
// Supports knowledge-agent.openai-trace-conversation-history: prepares local conversation storage.
// Supports knowledge-agent.library-index-only-agent-input: keeps local Library path setup outside main agent inputs.
// Supports knowledge-agent.storage-agnostic-runtime: implements the local filesystem storage preparation.

import { cp, mkdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { ensureConversationsLibrary } from "./ensure-conversations-library.js";
import { ensureMemoryLibrary } from "./ensure-memory-library.js";
import { resolveLocalRoot } from "./resolve-local-root.js";
import type { PreparedRuntime, StoragePrepareInput } from "./types.js";

/**
 * Prepares host-local Knowledge Agent folders used to stage sandbox-discoverable Libraries.
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
  const conversationsLibrary = resolve(
    repoRootPath,
    join(knowledgeAgentRoot, "conversations"),
  );
  const memoryLibrary = resolve(
    repoRootPath,
    join(knowledgeAgentRoot, "memory"),
  );
  const sandboxWorkspace = resolve(
    repoRootPath,
    sandboxWorkspaceInput || join(knowledgeAgentRoot, "sandbox-workspaces", conversationId),
  );
  const sandboxRepoRoot = join(sandboxWorkspace, "repo");
  await ensureConversationsLibrary(conversationsLibrary);
  await ensureMemoryLibrary(memoryLibrary);
  await mkdir(sandboxWorkspace, { recursive: true });
  await rm(join(sandboxWorkspace, "conversations"), { recursive: true, force: true });
  await rm(join(sandboxWorkspace, "memory"), { recursive: true, force: true });
  await cp(conversationsLibrary, join(sandboxWorkspace, "conversations"), {
    recursive: true,
  });
  await cp(memoryLibrary, join(sandboxWorkspace, "memory"), {
    recursive: true,
  });
  return {
    localRoot,
    conversationsLibrary,
    memoryLibrary,
    sandboxWorkspace,
    sandboxRepoRoot,
  };
}
