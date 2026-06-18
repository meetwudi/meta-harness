// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.library-writes-memory: persists sandbox memory Library updates after SDK execution.
// Supports knowledge-agent.openai-trace-conversation-history: persists conversation notes written inside the sandbox.
// Supports knowledge-agent.storage-agnostic-runtime: implements local filesystem sync-back for the storage interface.

import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { PreparedRuntime, ProviderRunOptions } from "./types.js";

/**
 * Copies writable Library directories from the completed sandbox workspace back to local storage.
 */
export async function syncSandboxLibraries(
  options: ProviderRunOptions,
  localRuntime: PreparedRuntime,
): Promise<void> {
  const entries = await readdir(options.sandboxWorkspace, { withFileTypes: true });
  const candidates: Array<{ path: string; mtimeMs: number }> = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith("openai-agents-sandbox-")) {
      continue;
    }
    const path = join(options.sandboxWorkspace, entry.name);
    candidates.push({ path, mtimeMs: (await stat(path)).mtimeMs });
  }
  candidates.sort((left, right) => right.mtimeMs - left.mtimeMs);
  const workspaceRoot = candidates[0]?.path;
  if (!workspaceRoot) {
    return;
  }

  const libraries = [
    { source: join(workspaceRoot, "conversations"), target: localRuntime.conversationsLibrary },
    { source: join(workspaceRoot, "memory"), target: localRuntime.memoryLibrary },
  ];
  for (const library of libraries) {
    try {
      await stat(library.source);
    } catch (error: unknown) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        continue;
      }
      throw error;
    }
    await rm(library.target, { recursive: true, force: true });
    await mkdir(dirname(library.target), { recursive: true });
    await cp(library.source, library.target, { recursive: true });
  }
}
