"use client";

import { HttpAgent, type AgentSubscriber } from "@ag-ui/client";
import type { Message, RunAgentInput } from "@ag-ui/core";
import { CopilotKit } from "@copilotkit/react-core/v2";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type ReasoningEffort =
  | "none"
  | "low"
  | "medium"
  | "high"
  | "xhigh";

export const reasoningEfforts: ReasoningEffort[] = [
  "none",
  "low",
  "medium",
  "high",
  "xhigh",
];

export type ModelOption = {
  id: string;
  label: string;
};

type ReasoningEffortContextValue = {
  reasoningEffort: ReasoningEffort;
  setReasoningEffort: (reasoningEffort: ReasoningEffort) => void;
};

type ModelContextValue = {
  defaultModel: string | null;
  modelOptions: ModelOption[];
  selectedModel: string | null;
  setSelectedModel: (model: string) => void;
};

const ReasoningEffortContext = createContext<ReasoningEffortContextValue | null>(null);
const ModelContext = createContext<ModelContextValue | null>(null);

function objectRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function withQuartzChatConfig(
  agent: HttpAgent,
  getReasoningEffort: () => ReasoningEffort,
  getSelectedModel: () => string | null,
) {
  agent.use((input: RunAgentInput, next) => {
    const selectedModel = getSelectedModel();
    return next.run({
      ...input,
      forwardedProps: {
        ...objectRecord(input.forwardedProps),
        reasoningEffort: getReasoningEffort(),
        ...(selectedModel ? { model: selectedModel } : {}),
      },
    });
  });

  return agent;
}

function latestReasoningStatus(delta: string): string {
  const parts = delta
    .split("\n")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.at(-1) ?? delta.trim();
}

function withLiveReasoningStatus(agent: HttpAgent) {
  const subscriber: AgentSubscriber = {
    onReasoningMessageContentEvent({ event, messages }) {
      const status = latestReasoningStatus(event.delta);
      if (!status) {
        return { stopPropagation: true };
      }

      const nextMessages = messages.map((message): Message => {
        if (message.id !== event.messageId || message.role !== "reasoning") {
          return message as Message;
        }

        return {
          ...message,
          content: status,
        } as Message;
      });

      return {
        messages: nextMessages,
        stopPropagation: true,
      };
    },
  };

  agent.subscribe(subscriber);
  return agent;
}

export function useReasoningEffort() {
  const context = useContext(ReasoningEffortContext);
  if (!context) {
    throw new Error("useReasoningEffort must be used inside Providers");
  }

  return context;
}

export function useModelSelection() {
  const context = useContext(ModelContext);
  if (!context) {
    throw new Error("useModelSelection must be used inside Providers");
  }

  return context;
}

function isModelOption(value: unknown): value is ModelOption {
  const candidate = objectRecord(value);
  return typeof candidate.id === "string" && typeof candidate.label === "string";
}

// Harness-Requirement: proj-quartz.knowledge-agent-chat-service
// Harness-Requirement: proj-quartz.reasoning-effort-selector
// Harness-Requirement: proj-quartz.model-selector
export function Providers({ children }: { children: React.ReactNode }) {
  const [reasoningEffort, setReasoningEffort] =
    useState<ReasoningEffort>("medium");
  const [defaultModel, setDefaultModel] = useState<string | null>(null);
  const [modelOptions, setModelOptions] = useState<ModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const reasoningEffortRef = useRef<ReasoningEffort>(reasoningEffort);
  const selectedModelRef = useRef<string | null>(selectedModel);

  useEffect(() => {
    reasoningEffortRef.current = reasoningEffort;
  }, [reasoningEffort]);

  useEffect(() => {
    selectedModelRef.current = selectedModel;
  }, [selectedModel]);

  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      const response = await fetch("/api/knowledge-agent", {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`Knowledge Agent config failed: ${response.status}`);
      }
      const config = objectRecord(await response.json());
      const options = Array.isArray(config.modelOptions)
        ? config.modelOptions.filter(isModelOption)
        : [];
      const configuredDefault =
        typeof config.defaultModel === "string" ? config.defaultModel : null;
      if (!configuredDefault || options.length === 0) {
        throw new Error("Knowledge Agent model config is incomplete.");
      }

      if (!cancelled) {
        setDefaultModel(configuredDefault);
        setModelOptions(options);
        setSelectedModel((current) => current ?? configuredDefault);
      }
    }

    loadConfig().catch((error) => {
      console.error(error);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const agents = useMemo(
    () => ({
      default: withLiveReasoningStatus(
        withQuartzChatConfig(
          new HttpAgent({
            agentId: "default",
            url: "/api/knowledge-agent",
          }),
          () => reasoningEffortRef.current,
          () => selectedModelRef.current,
        ),
      ),
      "knowledge-agent": withLiveReasoningStatus(
        withQuartzChatConfig(
          new HttpAgent({
            agentId: "knowledge-agent",
            url: "/api/knowledge-agent",
          }),
          () => reasoningEffortRef.current,
          () => selectedModelRef.current,
        ),
      ),
    }),
    [],
  );

  const reasoningEffortContext = useMemo(
    () => ({ reasoningEffort, setReasoningEffort }),
    [reasoningEffort],
  );
  const modelContext = useMemo(
    () => ({
      defaultModel,
      modelOptions,
      selectedModel,
      setSelectedModel,
    }),
    [defaultModel, modelOptions, selectedModel],
  );

  return (
    <ReasoningEffortContext.Provider
      value={reasoningEffortContext}
    >
      <ModelContext.Provider
        value={modelContext}
      >
        <CopilotKit
          agents__unsafe_dev_only={agents}
          enableInspector={false}
          showDevConsole={false}
        >
          {children}
        </CopilotKit>
      </ModelContext.Provider>
    </ReasoningEffortContext.Provider>
  );
}
