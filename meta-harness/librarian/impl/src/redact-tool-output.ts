// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.tool-call-observability: redacts file contents from recorded tool outputs.

const REDACTED_FILE_CONTENTS = "<redacted file contents from the server>";

/**
 * Redacts file contents from a tool output before it is recorded.
 */
export function redactToolOutput(output: unknown): unknown {
  if (Array.isArray(output)) {
    return output.map(redactToolOutput);
  }
  if (typeof output !== "object" || output === null) {
    return output;
  }
  const record = output as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      key,
      key === "content" ? REDACTED_FILE_CONTENTS : redactToolOutput(value),
    ]),
  );
}
