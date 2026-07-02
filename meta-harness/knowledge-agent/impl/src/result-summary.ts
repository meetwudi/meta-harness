// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.openai-trace-conversation-history: serializes a compact SDK result into local history.

/**
 * Extracts a compact, JSON-safe summary from an SDK run result.
 */
export function resultSummary(result: unknown): Record<string, unknown> {
  if (typeof result === "object" && result !== null && "result" in result) {
    const wrapped = result as Record<string, unknown>;
    return {
      ...resultSummary(wrapped.result),
      trace: wrapped.trace,
      memoryCurator: wrapped.memoryCurator,
    };
  }
  if (typeof result !== "object" || result === null) {
    return { finalOutput: String(result) };
  }
  const record = result as Record<string, unknown>;
  if ("failure" in record) {
    return {
      finalOutput: record.finalOutput,
      failure: record.failure,
    };
  }
  return {
    finalOutput: record.finalOutput,
    usage: record.usage,
    state: record.state,
    newItems: record.newItems,
  };
}
