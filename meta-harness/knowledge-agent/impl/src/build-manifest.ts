// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.library-index-goal-input: stages the repo and request for SDK sandbox discovery.
// Supports knowledge-agent.library-writes-memory: stages writable memory Libraries as ordinary sandbox directories.
// Supports knowledge-agent.library-index-only-agent-input: exposes writable Libraries through sandbox discovery.

import {
  Manifest,
  file,
  localDir,
} from "@openai/agents/sandbox";
import { join } from "node:path";
import type { ProviderRunOptions } from "./types.js";
import { buildRequest } from "./build-request.js";

/**
 * Builds the OpenAI Agents SDK sandbox manifest for repository reads and memory Library writes.
 */
export function buildManifest(options: ProviderRunOptions): Manifest {
  const stagedConversations = join(options.sandboxWorkspace, "conversations");
  const stagedMemory = join(options.sandboxWorkspace, "memory");
  return new Manifest({
    root: "/workspace",
    extraPathGrants: [
      {
        path: options.sandboxRepoRoot,
        readOnly: true,
        description: "Prepared Knowledge Agent sandbox repo copy.",
      },
      {
        path: stagedConversations,
        readOnly: false,
        description: "Writable Knowledge Agent conversations Library.",
      },
      {
        path: stagedMemory,
        readOnly: false,
        description: "Writable Knowledge Agent memory Library.",
      },
    ],
    entries: {
      repo: localDir({
        src: options.sandboxRepoRoot,
        description: "Current Meta Harness project folder.",
      }),
      conversations: localDir({
        src: stagedConversations,
        description: "Local writable Knowledge Agent conversations Library.",
      }),
      memory: localDir({
        src: stagedMemory,
        description: "Local writable Knowledge Agent memory Library.",
      }),
      "knowledge-agent/request.md": file({
        content: buildRequest(options),
      }),
    },
  });
}
