import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import nextEnv from "@next/env";
import { NextRequest } from "next/server";
import {
  createKnowledgeAgentSseStream,
  type AgUiMessage,
  type KnowledgeAgentChatConfig,
  type KnowledgeAgentStreamSource,
  type ModelOption,
  type ReasoningEffort,
  type RunAgentInput,
} from "./stream-response";
import {
  writeThreadTurnReasoning,
  type ReasoningDeltaRecord,
} from "./conversations/route";
import {
  quartzResourceActorContext,
  quartzResourceActorEnv,
  sessionFromToken,
  withQuartzAuthDb,
  type QuartzResourceActorContext,
} from "../../lib/quartz-auth-db";
import { readQuartzSessionCookie } from "../../lib/quartz-auth-cookie";

const { loadEnvConfig } = nextEnv;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 3600;

// Harness-Requirement: proj-quartz.knowledge-agent-chat-service
// Harness-Requirement: proj-quartz.postgres-backed-libraries
// Harness-Requirement: proj-quartz.local-postgres-deployment
// Harness-Requirement: proj-quartz.project-owned-config
// Harness-Requirement: proj-quartz.follow-up-chat-context
// Harness-Requirement: proj-quartz.memory-curator-actor
// Harness-Requirement: proj-quartz.reasoning-effort-selector
// Harness-Requirement: proj-quartz.reasoning-event-rendering
// Harness-Requirement: proj-quartz.model-selector

type KnowledgeAgentSubprocessEvent =
  | {
      type: "progress";
      message: string;
      source: KnowledgeAgentStreamSource;
    }
  | {
      type: "reasoning_delta";
      delta: string;
      source: KnowledgeAgentStreamSource;
    }
  | {
      type: "text_delta";
      delta: string;
      source: KnowledgeAgentStreamSource;
    }
  | {
      type: "final_output";
      output: string;
    };

const defaultTimeoutMs = 3_600_000;
const defaultReasoningEffort: ReasoningEffort = "medium";
let quartzProjectEnvLoaded = false;
const reasoningEfforts: ReasoningEffort[] = [
  "none",
  "low",
  "medium",
  "high",
  "xhigh",
];
const secretEnvNames = [
  "OPENAI_API_KEY",
  "QUARTZ_POSTGRES_URL",
  "QUARTZ_GOOGLE_CLIENT_ID",
  "QUARTZ_GOOGLE_CLIENT_SECRET",
  "QUARTZ_RESEND_API_KEY",
  "QUARTZ_RESEND_FROM",
  "QUARTZ_PRODUCTION_API_KEY",
];

function repoRootPath(): string {
  if (process.env.QUARTZ_REPO_ROOT) {
    return path.resolve(process.env.QUARTZ_REPO_ROOT);
  }

  return path.resolve(process.cwd(), "../..");
}

function projectConfigPath(): string {
  return process.env.QUARTZ_PROJECT_CONFIG ?? "proj-quartz/.meta-harness.json";
}

function quartzProjectRootPath(): string {
  return process.env.QUARTZ_PROJECT_ROOT
    ? path.resolve(process.env.QUARTZ_PROJECT_ROOT)
    : path.resolve(process.cwd(), "..");
}

function loadQuartzProjectEnv(): void {
  if (quartzProjectEnvLoaded) {
    return;
  }
  // Next dev preloads app-level env; force the project-root Quartz env here.
  loadEnvConfig(quartzProjectRootPath(), process.env.NODE_ENV !== "production", console, true);
  quartzProjectEnvLoaded = true;
}

function assertQuartzPostgresConfigured(): void {
  loadQuartzProjectEnv();
  if (!process.env.QUARTZ_POSTGRES_URL) {
    throw new Error("QUARTZ_POSTGRES_URL is required for Quartz runtime storage.");
  }
}

function projectConfigFilePath(): string {
  return path.join(process.cwd(), "..", ".meta-harness.json");
}

function safeId(value: string, label: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 96);
  if (!cleaned) {
    throw new Error(`${label} must contain at least one URL-safe identifier character.`);
  }
  return cleaned;
}

function objectRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function isReasoningEffort(value: string): value is ReasoningEffort {
  return reasoningEfforts.some((effort) => effort === value);
}

function isModelOption(value: unknown): value is ModelOption {
  const candidate = objectRecord(value);
  return typeof candidate.id === "string" && typeof candidate.label === "string";
}

export function configuredKnowledgeAgentTimeoutMs(): number {
  const raw = process.env.QUARTZ_KNOWLEDGE_AGENT_TIMEOUT_MS;
  if (raw === undefined) {
    return defaultTimeoutMs;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("QUARTZ_KNOWLEDGE_AGENT_TIMEOUT_MS must be a positive number of milliseconds.");
  }
  return value;
}

function redactDiagnosticText(value: string): string {
  let redacted = value;
  for (const name of secretEnvNames) {
    const secret = process.env[name];
    if (secret) {
      redacted = redacted.split(secret).join(`[redacted:${name}]`);
    }
  }
  return redacted
    .replace(/(postgres(?:ql)?:\/\/[^:\s/@]+):([^@\s]+)@/gi, "$1:[redacted]@")
    .replace(/(sk-[A-Za-z0-9_-]{8})[A-Za-z0-9_-]+/g, "$1[redacted]");
}

export function diagnosticTail(value: string, maxLines = 12, maxChars = 4000): string {
  return redactDiagnosticText(value)
    .trim()
    .split("\n")
    .slice(-maxLines)
    .join("\n")
    .slice(-maxChars);
}

export function validateKnowledgeAgentModelOptions(value: unknown): ModelOption[] {
  if (!Array.isArray(value)) {
    throw new Error(
      "Quartz Knowledge Agent modelOptions must be configured as an array in project knowledge.",
    );
  }
  if (value.length === 0) {
    throw new Error(
      "Quartz Knowledge Agent modelOptions must be configured in project knowledge.",
    );
  }
  return value.map((option, index) => {
    if (!isModelOption(option)) {
      throw new Error(
        `Quartz Knowledge Agent modelOptions[${index}] must include string id and label fields.`,
      );
    }
    return option;
  });
}

function streamSource(value: unknown): KnowledgeAgentStreamSource {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  throw new Error("Malformed Knowledge Agent stream event: source must be a non-empty string.");
}

function loadKnowledgeAgentChatConfig(): KnowledgeAgentChatConfig {
  loadQuartzProjectEnv();
  const config = objectRecord(
    JSON.parse(readFileSync(projectConfigFilePath(), "utf8")),
  );
  const knowledgeAgent = objectRecord(config.knowledgeAgent);
  const modelOptions = validateKnowledgeAgentModelOptions(knowledgeAgent.modelOptions);
  const configuredDefault =
    typeof knowledgeAgent.defaultModel === "string"
      ? knowledgeAgent.defaultModel
      : "";
  const defaultModel = process.env.KNOWLEDGE_AGENT_MODEL ?? configuredDefault;

  if (!defaultModel) {
    throw new Error(
      "Quartz Knowledge Agent defaultModel must be configured in project knowledge.",
    );
  }
  if (!modelOptions.some((option) => option.id === defaultModel)) {
    throw new Error(
      `Quartz Knowledge Agent default model '${defaultModel}' is not in configured modelOptions.`,
    );
  }

  return {
    defaultModel,
    modelOptions,
  };
}

function reasoningEffortFromInput(input: RunAgentInput): ReasoningEffort {
  const value = objectRecord(input.forwardedProps).reasoningEffort;
  if (value === undefined) {
    return defaultReasoningEffort;
  }

  if (typeof value === "string" && isReasoningEffort(value)) {
    return value;
  }

  throw new Error(
    `Invalid reasoning effort. Expected one of ${reasoningEfforts.join(", ")}.`,
  );
}

function modelFromInput(
  input: RunAgentInput,
  config: KnowledgeAgentChatConfig,
): string {
  const value = objectRecord(input.forwardedProps).model;
  if (value === undefined) {
    return config.defaultModel;
  }

  if (
    typeof value === "string"
    && config.modelOptions.some((option) => option.id === value)
  ) {
    return value;
  }

  throw new Error(
    `Invalid model. Expected one of ${config.modelOptions
      .map((option) => option.id)
      .join(", ")}.`,
  );
}

function messageText(message: AgUiMessage): string {
  if (typeof message.content === "string") {
    return message.content.trim();
  }

  if (Array.isArray(message.content)) {
    return message.content
      .filter((part) => part.type === "text" && typeof part.text === "string")
      .map((part) => part.text?.trim())
      .filter(Boolean)
      .join("\n")
      .trim();
  }

  return "";
}

function latestUserGoal(input: RunAgentInput): string {
  for (const message of [...(input.messages ?? [])].reverse()) {
    if (message.role !== "user") {
      continue;
    }

    const text = messageText(message);
    if (text) {
      return text;
    }
  }

  return "";
}

function previousAssistantMessage(messages: { role?: string; text: string }[]): string {
  let lastUserIndex = -1;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === "user") {
      lastUserIndex = index;
      break;
    }
  }
  const beforeCurrent = lastUserIndex >= 0 ? messages.slice(0, lastUserIndex) : messages;
  for (const message of [...beforeCurrent].reverse()) {
    if (message.role === "assistant") {
      return message.text;
    }
  }
  return "";
}

function isAffirmativeFollowUp(value: string): boolean {
  return /^(sure|yes|yeah|yep|yup|ok|okay|please|do it|go ahead|show me|sounds good|that works|let's do it|lets do it)[.!?]*$/i
    .test(value.trim());
}

function contextualUserGoal(input: RunAgentInput): string {
  const messages = (input.messages ?? [])
    .map((message) => ({
      role: message.role,
      text: messageText(message),
    }))
    .filter((message) => message.text);
  const current = latestUserGoal(input);
  if (!current) {
    return "";
  }

  const recentTranscript = messages
    .slice(-8)
    .map((message) => `${message.role ?? "message"}: ${message.text}`)
    .join("\n\n");
  if (!recentTranscript) {
    return current;
  }

  const promptParts = [
    "Recent chat transcript:",
    recentTranscript,
    "",
    "Current user request:",
    current,
    "",
    "Use the transcript to resolve short follow-ups such as yes, sure, do it, show me, or that one. If the current request is not a follow-up, answer it normally.",
  ];
  const previousAssistant = previousAssistantMessage(messages);
  if (previousAssistant && isAffirmativeFollowUp(current)) {
    promptParts.push(
      "",
      "The current request is an affirmative follow-up. Treat it as the user accepting the previous assistant message or offer. Perform the offered action now and continue the prior intent.",
      "",
      "Previous assistant message:",
      previousAssistant,
    );
  }

  return promptParts.join("\n");
}

export function parseKnowledgeAgentSubprocessEvent(
  line: string,
): KnowledgeAgentSubprocessEvent {
  let parsed: unknown;
  try {
    parsed = JSON.parse(line) as unknown;
  } catch (error) {
    throw new Error(
      `Malformed Knowledge Agent stream event JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Malformed Knowledge Agent stream event: expected a JSON object.");
  }
  const record = parsed as Record<string, unknown>;
  switch (record.type) {
    case "progress":
      if (typeof record.message !== "string") {
        throw new Error("Malformed Knowledge Agent progress event: message must be a string.");
      }
      return {
        type: "progress",
        message: record.message,
        source: streamSource(record.source),
      };
    case "reasoning_delta":
      if (typeof record.delta !== "string") {
        throw new Error("Malformed Knowledge Agent reasoning_delta event: delta must be a string.");
      }
      return {
        type: "reasoning_delta",
        delta: record.delta,
        source: streamSource(record.source),
      };
    case "text_delta":
      if (typeof record.delta !== "string") {
        throw new Error("Malformed Knowledge Agent text_delta event: delta must be a string.");
      }
      return {
        type: "text_delta",
        delta: record.delta,
        source: streamSource(record.source),
      };
    case "final_output":
      if (typeof record.output !== "string") {
        throw new Error("Malformed Knowledge Agent final_output event: output must be a string.");
      }
      return {
        type: "final_output",
        output: record.output,
      };
    default:
      throw new Error("Malformed Knowledge Agent stream event: unknown event type.");
  }
}

export function resolveKnowledgeAgentOutput(input: {
  finalOutput: string;
  streamedMainText: string;
  rawStdout: string;
}): string {
  const output = (
    input.finalOutput ||
    input.streamedMainText
  ).trim();
  if (output) {
    return output;
  }

  const stdoutTail = diagnosticTail(input.rawStdout, 4);
  const diagnostic = stdoutTail
    ? ` Raw stdout tail: ${stdoutTail}`
    : "";
  throw new Error(
    `Knowledge Agent completed without structured final output or text events.${diagnostic}`,
  );
}

async function runKnowledgeAgent(input: {
  goal: string;
  latestUserMessage: string;
  threadId: string;
  runId: string;
  model: string;
  reasoningEffort: ReasoningEffort;
  actorContext: QuartzResourceActorContext;
  signal?: AbortSignal;
  onProgress?: (message: string, source: KnowledgeAgentStreamSource) => void;
  onReasoningDelta?: (delta: string, source: KnowledgeAgentStreamSource) => void;
  onTextDelta?: (delta: string, source: KnowledgeAgentStreamSource) => void;
}): Promise<string> {
  assertQuartzPostgresConfigured();
  const repoRoot = repoRootPath();
  const cliPath = path.join(
    repoRoot,
    "meta-harness",
    "knowledge-agent",
    "impl",
    "dist",
    "cli.js",
  );
  const timeoutMs = configuredKnowledgeAgentTimeoutMs();
  const turnId = `quartz-${safeId(input.runId, "runId")}`;

  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const reasoningRecords: ReasoningDeltaRecord[] = [];
    const child = spawn(
      process.execPath,
      [
        cliPath,
        "run",
        "--repo-root",
        repoRoot,
        "--project-config",
        projectConfigPath(),
        "--conversation-id",
        `quartz-${safeId(input.threadId, "threadId")}`,
        "--turn-id",
        turnId,
        "--model",
        input.model,
        "--reasoning-effort",
        input.reasoningEffort,
        "--goal",
        input.goal,
        "--latest-user-message",
        input.latestUserMessage,
        "--stream-events",
      ],
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          ...quartzResourceActorEnv(input.actorContext),
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    let stdout = "";
    let stderr = "";
    let stdoutLineBuffer = "";
    let finalOutput = "";
    let streamedMainText = "";
    let failed = false;
    let settled = false;
    let timedOut = false;
    let exitCode: number | null = null;
    let exitSignal: NodeJS.Signals | null = null;
    const diagnostic = (reason: string, error: Error) => ({
      event: "quartz_knowledge_agent_subprocess_failure",
      reason,
      error: error.message,
      threadId: input.threadId,
      runId: input.runId,
      turnId,
      model: input.model,
      reasoningEffort: input.reasoningEffort,
      timeoutMs,
      elapsedMs: Date.now() - startedAt,
      timedOut,
      exitCode,
      exitSignal,
      stdoutTail: diagnosticTail(stdout),
      stderrTail: diagnosticTail(stderr),
    });
    const cleanupAbort = () => {
      input.signal?.removeEventListener("abort", handleAbort);
    };
    const rejectOnce = (error: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      failed = true;
      cleanupAbort();
      clearTimeout(timeout);
      reject(error);
    };
    const rejectWithDiagnostic = (error: Error, reason: string) => {
      const details = diagnostic(reason, error);
      console.error(JSON.stringify(details));
      rejectOnce(
        new Error(
          [
            error.message,
            `turn=${turnId}`,
            `elapsedMs=${details.elapsedMs}`,
            `timeoutMs=${timeoutMs}`,
            details.stderrTail ? `stderrTail=${details.stderrTail}` : "",
            details.stdoutTail ? `stdoutTail=${details.stdoutTail}` : "",
          ].filter(Boolean).join("; "),
        ),
      );
    };
    const resolveOnce = (output: string) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanupAbort();
      clearTimeout(timeout);
      resolve(output);
    };
    const handleAbort = () => {
      child.kill("SIGTERM");
      rejectOnce(new DOMException("Knowledge Agent run stopped.", "AbortError"));
    };
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      rejectWithDiagnostic(
        new Error(`Knowledge Agent run timed out after ${timeoutMs}ms.`),
        "timeout",
      );
    }, timeoutMs);

    if (input.signal?.aborted) {
      handleAbort();
    } else {
      input.signal?.addEventListener("abort", handleAbort, { once: true });
    }

    const handleStdoutLine = (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return;
      }

      const event = parseKnowledgeAgentSubprocessEvent(trimmed);

      if (event.type === "progress") {
        input.onProgress?.(event.message, event.source);
        return;
      }

      if (event.type === "reasoning_delta") {
        reasoningRecords.push({
          source: event.source,
          delta: event.delta,
          recordedAt: new Date().toISOString(),
        });
        input.onReasoningDelta?.(event.delta, event.source);
        return;
      }

      if (event.type === "text_delta") {
        if (event.source === "main") {
          streamedMainText += event.delta;
        }
        input.onTextDelta?.(event.delta, event.source);
        return;
      }

      if (event.type === "final_output") {
        finalOutput = event.output;
      }
    };

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      try {
        stdout += chunk;
        stdoutLineBuffer += chunk;
        const lines = stdoutLineBuffer.split("\n");
        stdoutLineBuffer = lines.pop() ?? "";
        for (const line of lines) {
          handleStdoutLine(line);
        }
      } catch (error) {
        child.kill("SIGTERM");
        rejectWithDiagnostic(
          error instanceof Error ? error : new Error(String(error)),
          "stdout_parse_error",
        );
      }
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      rejectWithDiagnostic(error, "spawn_error");
    });
    child.on("close", async (code, signal) => {
      exitCode = code;
      exitSignal = signal;
      if (failed) {
        return;
      }
      if (stdoutLineBuffer) {
        try {
          handleStdoutLine(stdoutLineBuffer);
          stdoutLineBuffer = "";
        } catch (error) {
          rejectWithDiagnostic(
            error instanceof Error ? error : new Error(String(error)),
            "stdout_parse_error",
          );
          return;
        }
      }
      if (code === 0) {
        try {
          await writeThreadTurnReasoning({
            threadId: input.threadId,
            turnId,
            records: reasoningRecords,
            actorContext: input.actorContext,
          });
          resolveOnce(resolveKnowledgeAgentOutput({
            finalOutput,
            streamedMainText,
            rawStdout: stdout,
          }));
        } catch (error) {
          rejectOnce(error instanceof Error ? error : new Error(String(error)));
        }
        return;
      }

      rejectWithDiagnostic(
        new Error(
          (diagnosticTail(stderr, 8) || diagnosticTail(stdout, 8) || `Knowledge Agent exited ${code}`)
            .split("\n")
            .slice(-8)
            .join("\n"),
        ),
        "exit",
      );
    });
  });
}

export async function GET() {
  try {
    return Response.json(loadKnowledgeAgentChatConfig());
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Knowledge Agent config failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const input = (await request.json()) as RunAgentInput;
  const sessionToken = await readQuartzSessionCookie();
  const session = await withQuartzAuthDb((client) => sessionFromToken(client, sessionToken));
  if (!session) {
    return Response.json({ error: "Sign-in is required." }, { status: 401 });
  }
  if (!session.activeOrganization) {
    return Response.json(
      { error: "Create or join an organization to use Quartz." },
      { status: 409 },
    );
  }
  const actorContext = quartzResourceActorContext(session);
  const threadId = safeId(input.threadId ?? crypto.randomUUID(), "threadId");
  const runId = safeId(input.runId ?? crypto.randomUUID(), "runId");

  const stream = createKnowledgeAgentSseStream({
    runInput: input,
    threadId,
    runId,
    loadChatConfig: loadKnowledgeAgentChatConfig,
    latestUserGoal,
    contextualUserGoal,
    reasoningEffortFromInput,
    modelFromInput,
    runKnowledgeAgent: (runnerInput) => runKnowledgeAgent({
      ...runnerInput,
      actorContext,
    }),
    abortSignal: request.signal,
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
