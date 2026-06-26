import { spawn } from "node:child_process";
import path from "node:path";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 180;

// Harness-Requirement: proj-quartz.knowledge-agent-chat-service
// Harness-Requirement: proj-quartz.postgres-backed-libraries
// Harness-Requirement: proj-quartz.local-postgres-deployment
// Harness-Requirement: proj-quartz.project-owned-config
// Harness-Requirement: proj-quartz.follow-up-chat-context
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
};

type AgUiEvent = Record<string, unknown> & {
  type: string;
};

const textEncoder = new TextEncoder();
const defaultTimeoutMs = 180_000;

function repoRootPath(): string {
  if (process.env.QUARTZ_REPO_ROOT) {
    return path.resolve(process.env.QUARTZ_REPO_ROOT);
  }

  return path.resolve(process.cwd(), "../..");
}

function projectConfigPath(): string {
  return process.env.QUARTZ_PROJECT_CONFIG ?? "proj-quartz/.meta-harness.json";
}

function assertQuartzPostgresConfigured(): void {
  if (!process.env.QUARTZ_POSTGRES_URL) {
    throw new Error("QUARTZ_POSTGRES_URL is required for PROJ-Quartz runtime storage.");
  }
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

async function runKnowledgeAgent(input: {
  goal: string;
  threadId: string;
  runId: string;
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
        "--goal",
        input.goal,
      ],
      {
        cwd: repoRoot,
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("Knowledge Agent run timed out."));
    }, timeoutMs);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
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
      if (code === 0) {
        resolve(stdout.trim());
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

export async function POST(request: NextRequest) {
  const input = (await request.json()) as RunAgentInput;
  const threadId = safeId(input.threadId ?? crypto.randomUUID(), "thread");
  const runId = safeId(input.runId ?? crypto.randomUUID(), "run");

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const messageId = `quartz-message-${crypto.randomUUID()}`;
      const send = (event: AgUiEvent) => controller.enqueue(eventBytes(event));

      send({
        type: "RUN_STARTED",
        threadId,
        runId,
        input,
      });
      send({
        type: "TEXT_MESSAGE_START",
        messageId,
        role: "assistant",
      });

      try {
        const goal = contextualUserGoal(input);
        if (!goal) {
          throw new Error("Send a message for the Knowledge Agent to answer.");
        }

        const output = await runKnowledgeAgent({ goal, threadId, runId });
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
