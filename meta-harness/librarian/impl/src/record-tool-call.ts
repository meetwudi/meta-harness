// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.tool-call-observability: records ordered Librarian tool calls in conversation context.

import { redactToolOutput } from "./redact-tool-output.js";
import type { LibrarianContext } from "./types.js";

/**
 * Records one Librarian tool call event in the shared conversation context.
 */
export function recordToolCall(
  context: LibrarianContext,
  toolName: string,
  input: Record<string, unknown>,
  output: unknown,
): void {
  context.toolCallEvents.push({
    order: context.toolCallEvents.length + 1,
    sessionId: context.sessionId,
    actorUri: context.actorUri,
    actorUris: context.actorUris,
    toolName,
    input,
    output: redactToolOutput(output),
    recordedAt: new Date().toISOString(),
  });
}
