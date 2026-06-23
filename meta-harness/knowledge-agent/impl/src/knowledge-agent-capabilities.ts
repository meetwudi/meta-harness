// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.uses-librarian: keeps Library resource edits routed through Librarian.
// Supports knowledge-agent.library-scoped-access: avoids sandbox filesystem writes for Library resources.

import {
  compaction,
  shell,
  type Capability,
} from "@openai/agents/sandbox";

/**
 * Returns sandbox capabilities for Knowledge Agent runs.
 *
 * Library resources are accessed through Librarian tools, not sandbox
 * filesystem patch tools. The sandbox remains available for shell-based
 * inspection of staged runtime artifacts.
 */
export function knowledgeAgentCapabilities(): Capability[] {
  return [
    shell(),
    compaction(),
  ];
}
