// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.run-failure-observability: records structured provider failure diagnostics.

import { configuredRunLimits } from "./run-limits.js";
import type { ProviderRunOptions } from "./types.js";

export type KnowledgeAgentRunFailure = {
  status: "failed";
  phase: string;
  kind: string;
  recordedAt: string;
  provider: string;
  model: string;
  conversationId: string;
  turnId: string;
  configuredLimits: Record<string, number | null>;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  sdk?: {
    toolName?: string;
    timeoutMs?: number;
  };
  observations: {
    librarianToolCalls: number;
  };
};

export function knowledgeAgentRunFailure(
  error: unknown,
  options: ProviderRunOptions,
  input: {
    provider: string;
    phase: string;
  },
): KnowledgeAgentRunFailure {
  return {
    status: "failed",
    phase: input.phase,
    kind: errorKind(error),
    recordedAt: new Date().toISOString(),
    provider: input.provider,
    model: options.model,
    conversationId: options.conversationId,
    turnId: options.turnId,
    configuredLimits: configuredRunLimits(),
    error: {
      name: errorName(error),
      message: errorMessage(error),
      stack: errorStack(error),
    },
    sdk: sdkErrorFields(error),
    observations: {
      librarianToolCalls: options.librarianContext.toolCallEvents.length,
    },
  };
}

export function failureResult(
  failure: KnowledgeAgentRunFailure,
): Record<string, unknown> {
  return {
    finalOutput: "",
    failure,
  };
}

export function failureMessage(failure: KnowledgeAgentRunFailure): string {
  return [
    `Knowledge Agent run failed (${failure.kind})`,
    failure.error.message,
    `conversation=${failure.conversationId}`,
    `turn=${failure.turnId}`,
    `model=${failure.model}`,
  ].join("; ");
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    return JSON.stringify(error) ?? String(error);
  } catch {
    return String(error);
  }
}

function errorKind(error: unknown): string {
  const name = errorName(error);
  if (name === "MaxTurnsExceededError") {
    return "max_turns_exceeded";
  }
  if (name === "ToolTimeoutError") {
    return "tool_timeout";
  }
  if (name === "AbortError") {
    return "aborted";
  }
  const message = errorMessage(error).toLowerCase();
  if (message.includes("timed out") || message.includes("timeout")) {
    return "timeout";
  }
  return "provider_error";
}

function errorName(error: unknown): string {
  if (error instanceof Error && error.name) {
    return error.name;
  }
  const record = objectRecord(error);
  return stringValue(record.name) || "Error";
}

function errorStack(error: unknown): string | undefined {
  if (error instanceof Error && typeof error.stack === "string") {
    return error.stack;
  }
  return undefined;
}

function sdkErrorFields(error: unknown): KnowledgeAgentRunFailure["sdk"] {
  const record = objectRecord(error);
  const toolName = stringValue(record.toolName);
  const timeoutMs = numberValue(record.timeoutMs);
  if (!toolName && timeoutMs === undefined) {
    return undefined;
  }
  return {
    toolName: toolName || undefined,
    timeoutMs,
  };
}

function objectRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
