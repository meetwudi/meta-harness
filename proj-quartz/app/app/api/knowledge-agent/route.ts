import { spawn } from "node:child_process";
import path from "node:path";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 180;

// Harness-Requirement: proj-quartz.knowledge-agent-chat-service
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
        const goal = latestUserGoal(input);
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
