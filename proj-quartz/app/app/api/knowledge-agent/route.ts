import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 180;

// Harness-Requirement: proj-quartz.knowledge-agent-chat-service
// Harness-Requirement: proj-quartz.postgres-backed-libraries
// Harness-Requirement: proj-quartz.local-postgres-deployment
// Harness-Requirement: proj-quartz.project-owned-config
// Harness-Requirement: proj-quartz.follow-up-chat-context
// Harness-Requirement: proj-quartz.memory-curator-actor
// Harness-Requirement: proj-quartz.reasoning-effort-selector
// Harness-Requirement: proj-quartz.reasoning-event-rendering
// Harness-Requirement: proj-quartz.model-selector
type AgUiContentPart = {
  type?: string;
  text?: string;
};

type AgUiMessage = {
  role?: string;
  content?: string | AgUiContentPart[];
};

type RunAgentInput = {
  threadId?: string;
  runId?: string;
  messages?: AgUiMessage[];
  forwardedProps?: unknown;
};

type AgUiEvent = Record<string, unknown> & {
  type: string;
};

type ReasoningEffort =
  | "none"
  | "low"
  | "medium"
  | "high"
  | "xhigh";

type ModelOption = {
  id: string;
  label: string;
};

type KnowledgeAgentChatConfig = {
  defaultModel: string;
  modelOptions: ModelOption[];
};

type KnowledgeAgentSubprocessEvent = {
  type?: unknown;
  message?: unknown;
  delta?: unknown;
  output?: unknown;
};

const textEncoder = new TextEncoder();
const defaultTimeoutMs = 180_000;
const defaultReasoningEffort: ReasoningEffort = "medium";
let quartzProjectEnvLoaded = false;
const reasoningEfforts: ReasoningEffort[] = [
  "none",
  "low",
  "medium",
  "high",
  "xhigh",
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
  loadEnvConfig(quartzProjectRootPath(), process.env.NODE_ENV !== "production");
  quartzProjectEnvLoaded = true;
}

function assertQuartzPostgresConfigured(): void {
  loadQuartzProjectEnv();
  if (!process.env.QUARTZ_POSTGRES_URL) {
    throw new Error("QUARTZ_POSTGRES_URL is required for PROJ-Quartz runtime storage.");
  }
}

function projectConfigFilePath(): string {
  return path.join(process.cwd(), "..", ".meta-harness.json");
}

function eventBytes(event: AgUiEvent): Uint8Array {
  return textEncoder.encode(
    `data: ${JSON.stringify({ timestamp: Date.now(), ...event })}\n\n`,
  );
}

function safeId(value: string, fallback: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 96);
  return cleaned || fallback;
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

function loadKnowledgeAgentChatConfig(): KnowledgeAgentChatConfig {
  loadQuartzProjectEnv();
  const config = objectRecord(
    JSON.parse(readFileSync(projectConfigFilePath(), "utf8")),
  );
  const knowledgeAgent = objectRecord(config.knowledgeAgent);
  const modelOptions = Array.isArray(knowledgeAgent.modelOptions)
    ? knowledgeAgent.modelOptions.filter(isModelOption)
    : [];
  const configuredDefault =
    typeof knowledgeAgent.defaultModel === "string"
      ? knowledgeAgent.defaultModel
      : "";
  const defaultModel = process.env.KNOWLEDGE_AGENT_MODEL ?? configuredDefault;

  if (modelOptions.length === 0) {
    throw new Error(
      "Quartz Knowledge Agent modelOptions must be configured in project knowledge.",
    );
  }
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
      "The current request is an affirmative follow-up. Treat it as the user accepting the previous assistant message or offer. Perform the offered action now instead of asking for confirmation again.",
      "",
      "Previous assistant message:",
      previousAssistant,
    );
  }

  return promptParts.join("\n");
}

function chunkText(value: string, size = 1200): string[] {
  const chunks: string[] = [];
  for (let index = 0; index < value.length; index += size) {
    chunks.push(value.slice(index, index + size));
  }
  return chunks.length > 0 ? chunks : [""];
}

function reasoningTraceStart(
  reasoningEffort: ReasoningEffort,
  model: string,
): string {
  return [
    "Preparing the Quartz Knowledge Agent run.",
    `Model: ${model}.`,
    `Reasoning effort: ${reasoningEffort}.`,
    "Inspecting governed project knowledge, Library context, and available tools.",
  ].join("\n");
}

function parseKnowledgeAgentSubprocessEvent(
  line: string,
): KnowledgeAgentSubprocessEvent | undefined {
  try {
    const parsed = JSON.parse(line) as unknown;
    return objectRecord(parsed);
  } catch {
    return undefined;
  }
}

async function runKnowledgeAgent(input: {
  goal: string;
  latestUserMessage: string;
  threadId: string;
  runId: string;
  model: string;
  reasoningEffort: ReasoningEffort;
  onProgress?: (message: string) => void;
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
  const timeoutMs = Number(
    process.env.QUARTZ_KNOWLEDGE_AGENT_TIMEOUT_MS ?? defaultTimeoutMs,
  );

  return new Promise((resolve, reject) => {
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
        `quartz-${safeId(input.threadId, "thread")}`,
        "--turn-id",
        `quartz-${safeId(input.runId, "run")}`,
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
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    let stdout = "";
    let stderr = "";
    let stdoutLineBuffer = "";
    let finalOutput = "";
    let streamedText = "";
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("Knowledge Agent run timed out."));
    }, timeoutMs);

    const handleStdoutLine = (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return;
      }

      const event = parseKnowledgeAgentSubprocessEvent(trimmed);
      if (!event) {
        stdout += `${line}\n`;
        return;
      }

      if (event.type === "progress" && typeof event.message === "string") {
        input.onProgress?.(event.message);
        return;
      }

      if (event.type === "text_delta" && typeof event.delta === "string") {
        streamedText += event.delta;
        return;
      }

      if (event.type === "final_output" && typeof event.output === "string") {
        finalOutput = event.output;
      }
    };

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdoutLineBuffer += chunk;
      const lines = stdoutLineBuffer.split("\n");
      stdoutLineBuffer = lines.pop() ?? "";
      for (const line of lines) {
        handleStdoutLine(line);
      }
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (stdoutLineBuffer) {
        handleStdoutLine(stdoutLineBuffer);
        stdoutLineBuffer = "";
      }
      if (code === 0) {
        resolve((finalOutput || streamedText || stdout).trim());
        return;
      }

      reject(
        new Error(
          (stderr.trim() || stdout.trim() || `Knowledge Agent exited ${code}`)
            .split("\n")
            .slice(-8)
            .join("\n"),
        ),
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
  const threadId = safeId(input.threadId ?? crypto.randomUUID(), "thread");
  const runId = safeId(input.runId ?? crypto.randomUUID(), "run");

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const messageId = `quartz-message-${crypto.randomUUID()}`;
      const reasoningMessageId = `quartz-reasoning-${crypto.randomUUID()}`;
      let reasoningStarted = false;
      let lastReasoningProgress = "";
      const send = (event: AgUiEvent) => controller.enqueue(eventBytes(event));
      const startReasoning = (
        reasoningEffort: ReasoningEffort,
        model: string,
      ) => {
        reasoningStarted = true;
        send({
          type: "REASONING_START",
          messageId: reasoningMessageId,
        });
        send({
          type: "REASONING_MESSAGE_START",
          messageId: reasoningMessageId,
          role: "reasoning",
        });
        send({
          type: "REASONING_MESSAGE_CONTENT",
          messageId: reasoningMessageId,
          delta: reasoningTraceStart(reasoningEffort, model),
        });
      };
      const appendReasoningProgress = (message: string) => {
        const cleanMessage = message.trim();
        if (
          !reasoningStarted
          || !cleanMessage
          || cleanMessage === lastReasoningProgress
        ) {
          return;
        }
        lastReasoningProgress = cleanMessage;
        send({
          type: "REASONING_MESSAGE_CONTENT",
          messageId: reasoningMessageId,
          delta: `\n${cleanMessage}`,
        });
      };
      const finishReasoning = (delta: string) => {
        if (!reasoningStarted) {
          return;
        }
        if (delta) {
          send({
            type: "REASONING_MESSAGE_CONTENT",
            messageId: reasoningMessageId,
            delta,
          });
        }
        send({
          type: "REASONING_MESSAGE_END",
          messageId: reasoningMessageId,
        });
        send({
          type: "REASONING_END",
          messageId: reasoningMessageId,
        });
        reasoningStarted = false;
      };

      send({
        type: "RUN_STARTED",
        threadId,
        runId,
        input,
      });

      try {
        const latestUserMessage = latestUserGoal(input);
        const goal = contextualUserGoal(input);
        const chatConfig = loadKnowledgeAgentChatConfig();
        const reasoningEffort = reasoningEffortFromInput(input);
        const model = modelFromInput(input, chatConfig);
        if (!latestUserMessage || !goal) {
          throw new Error("Send a message for the Knowledge Agent to answer.");
        }

        startReasoning(reasoningEffort, model);
        const output = await runKnowledgeAgent({
          goal,
          latestUserMessage,
          threadId,
          runId,
          model,
          reasoningEffort,
          onProgress: appendReasoningProgress,
        });
        finishReasoning("\nKnowledge Agent run finished. Preparing the answer.");
        send({
          type: "TEXT_MESSAGE_START",
          messageId,
          role: "assistant",
        });
        for (const chunk of chunkText(output)) {
          if (chunk) {
            send({
              type: "TEXT_MESSAGE_CONTENT",
              messageId,
              delta: chunk,
            });
          }
        }
        send({
          type: "TEXT_MESSAGE_END",
          messageId,
        });
        send({
          type: "RUN_FINISHED",
          threadId,
          runId,
          result: { messageId },
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Knowledge Agent run failed.";
        finishReasoning("\nKnowledge Agent run failed before completing.");
        send({
          type: "TEXT_MESSAGE_START",
          messageId,
          role: "assistant",
        });
        send({
          type: "TEXT_MESSAGE_CONTENT",
          messageId,
          delta: `Knowledge Agent run failed: ${message}`,
        });
        send({
          type: "TEXT_MESSAGE_END",
          messageId,
        });
        send({
          type: "RUN_ERROR",
          message,
          code: "knowledge_agent_error",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
