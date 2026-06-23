// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.storage-discovery-runtime: stages the prompt for SDK sandbox discovery.
// Supports knowledge-agent.uses-librarian: leaves Library operations to Librarian tools.

import {
  Manifest,
  file,
} from "@openai/agents/sandbox";
import type { ProviderRunOptions } from "./types.js";
import { buildKnowledgeAgentPrompt } from "./build-knowledge-agent-prompt.js";

/**
 * Builds the OpenAI Agents SDK sandbox manifest for the Knowledge Agent prompt.
 */
export function buildManifest(options: ProviderRunOptions): Manifest {
  return new Manifest({
    root: "/workspace",
    entries: {
      "knowledge-agent/knowledge-agent.md": file({
        content: buildKnowledgeAgentPrompt(options),
      }),
    },
  });
}
