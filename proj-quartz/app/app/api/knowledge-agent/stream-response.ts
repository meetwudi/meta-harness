// Harness-Requirement: proj-quartz.reasoning-event-rendering

export type AgUiContentPart = {
  type?: string;
  text?: string;
};

export type AgUiMessage = {
  role?: string;
  content?: string | AgUiContentPart[];
};

export type RunAgentInput = {
  threadId?: string;
  runId?: string;
  messages?: AgUiMessage[];
  forwardedProps?: unknown;
};

export type AgUiEvent = Record<string, unknown> & {
  type: string;
};

export type ReasoningEffort =
  | "none"
  | "low"
  | "medium"
  | "high"
  | "xhigh";

export type ModelOption = {
  id: string;
  label: string;
};

export type KnowledgeAgentChatConfig = {
  defaultModel: string;
  modelOptions: ModelOption[];
};

export type KnowledgeAgentStreamSource = string;

export type KnowledgeAgentRunner = (input: {
  goal: string;
  latestUserMessage: string;
  threadId: string;
  runId: string;
  model: string;
  reasoningEffort: ReasoningEffort;
  onProgress?: (message: string, source: KnowledgeAgentStreamSource) => void;
  onReasoningDelta?: (delta: string, source: KnowledgeAgentStreamSource) => void;
  onTextDelta?: (delta: string, source: KnowledgeAgentStreamSource) => void;
}) => Promise<string>;

const textEncoder = new TextEncoder();

function eventBytes(event: AgUiEvent): Uint8Array {
  return textEncoder.encode(
    `data: ${JSON.stringify({ timestamp: Date.now(), ...event })}\n\n`,
  );
}

function chunkText(value: string, size = 1200): string[] {
  const chunks: string[] = [];
  for (let index = 0; index < value.length; index += size) {
    chunks.push(value.slice(index, index + size));
  }
  return chunks.length > 0 ? chunks : [""];
}

function reasoningSourceMarker(source: KnowledgeAgentStreamSource): string {
  return `\n\n[[quartz-source:${source}]]\n`;
}

function reasoningCompleteMarker(): string {
  return "\n\n[[quartz-complete]]\n";
}

export function createKnowledgeAgentSseStream(input: {
  runInput: RunAgentInput;
  threadId: string;
  runId: string;
  loadChatConfig: () => KnowledgeAgentChatConfig;
  latestUserGoal: (input: RunAgentInput) => string;
  contextualUserGoal: (input: RunAgentInput) => string;
  reasoningEffortFromInput: (input: RunAgentInput) => ReasoningEffort;
  modelFromInput: (
    input: RunAgentInput,
    config: KnowledgeAgentChatConfig,
  ) => string;
  runKnowledgeAgent: KnowledgeAgentRunner;
}): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const messageId = `quartz-message-${crypto.randomUUID()}`;
      const reasoningMessageId = `quartz-reasoning-${crypto.randomUUID()}`;
      let reasoningStarted = false;
      let assistantStarted = false;
      let streamedAssistantText = "";
      let lastReasoningSource: KnowledgeAgentStreamSource | null = null;
      const send = (event: AgUiEvent) => controller.enqueue(eventBytes(event));
      const startAssistant = () => {
        if (assistantStarted) {
          return;
        }
        assistantStarted = true;
        send({
          type: "TEXT_MESSAGE_START",
          messageId,
          role: "assistant",
        });
      };
      const appendAssistantText = (
        delta: string,
        source: KnowledgeAgentStreamSource,
      ) => {
        if (!delta) {
          return;
        }
        if (source === "memory_curator") {
          appendReasoningDelta(delta, source);
          return;
        }
        startAssistant();
        streamedAssistantText += delta;
        send({
          type: "TEXT_MESSAGE_CONTENT",
          messageId,
          delta,
        });
      };
      const finishAssistant = (finalOutput: string) => {
        const output = finalOutput.trim();
        if (!assistantStarted) {
          startAssistant();
          for (const chunk of chunkText(output)) {
            if (chunk) {
              send({
                type: "TEXT_MESSAGE_CONTENT",
                messageId,
                delta: chunk,
              });
            }
          }
        } else if (
          output
          && streamedAssistantText
          && output.startsWith(streamedAssistantText)
        ) {
          const remainder = output.slice(streamedAssistantText.length);
          if (remainder) {
            send({
              type: "TEXT_MESSAGE_CONTENT",
              messageId,
              delta: remainder,
            });
          }
        }
        send({
          type: "TEXT_MESSAGE_END",
          messageId,
        });
      };
      const startReasoning = () => {
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
      };
      const appendReasoningDelta = (
        delta: string,
        source: KnowledgeAgentStreamSource,
      ) => {
        if (!delta) {
          return;
        }
        if (!reasoningStarted) {
          startReasoning();
        }
        if (lastReasoningSource !== source) {
          lastReasoningSource = source;
          send({
            type: "REASONING_MESSAGE_CONTENT",
            messageId: reasoningMessageId,
            delta: reasoningSourceMarker(source),
          });
        }
        send({
          type: "REASONING_MESSAGE_CONTENT",
          messageId: reasoningMessageId,
          delta,
        });
      };
      const finishReasoning = () => {
        if (!reasoningStarted) {
          return;
        }
        send({
          type: "REASONING_MESSAGE_CONTENT",
          messageId: reasoningMessageId,
          delta: reasoningCompleteMarker(),
        });
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
        threadId: input.threadId,
        runId: input.runId,
        input: input.runInput,
      });

      try {
        const latestUserMessage = input.latestUserGoal(input.runInput);
        const goal = input.contextualUserGoal(input.runInput);
        const chatConfig = input.loadChatConfig();
        const reasoningEffort = input.reasoningEffortFromInput(input.runInput);
        const model = input.modelFromInput(input.runInput, chatConfig);
        if (!latestUserMessage || !goal) {
          throw new Error("Send a message for the Knowledge Agent to answer.");
        }

        const output = await input.runKnowledgeAgent({
          goal,
          latestUserMessage,
          threadId: input.threadId,
          runId: input.runId,
          model,
          reasoningEffort,
          onReasoningDelta: appendReasoningDelta,
          onTextDelta: appendAssistantText,
        });
        finishReasoning();
        finishAssistant(output);
        send({
          type: "RUN_FINISHED",
          threadId: input.threadId,
          runId: input.runId,
          result: { messageId },
          outcome: { type: "success" },
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Knowledge Agent run failed.";
        finishReasoning();
        if (!assistantStarted) {
          startAssistant();
        }
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
}
