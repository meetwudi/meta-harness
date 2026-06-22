// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.conversation-turns: creates sortable turn ids.

/**
 * Returns a sortable turn id for one Knowledge Agent execution turn.
 */
export function defaultTurnId(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}
