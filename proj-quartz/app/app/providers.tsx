"use client";

import { HttpAgent } from "@ag-ui/client";
import type { RunAgentInput } from "@ag-ui/core";
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
  | "minimal"
  | "low"
  | "medium"
  | "high"
  | "xhigh";

export const reasoningEfforts: ReasoningEffort[] = [
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
];

type ReasoningEffortContextValue = {
  reasoningEffort: ReasoningEffort;
  setReasoningEffort: (reasoningEffort: ReasoningEffort) => void;
};

const ReasoningEffortContext = createContext<ReasoningEffortContextValue | null>(null);

function objectRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function withReasoningEffort(
  agent: HttpAgent,
  getReasoningEffort: () => ReasoningEffort,
) {
  agent.use((input: RunAgentInput, next) =>
    next.run({
      ...input,
      forwardedProps: {
        ...objectRecord(input.forwardedProps),
        reasoningEffort: getReasoningEffort(),
      },
    }),
  );

  return agent;
}

export function useReasoningEffort() {
  const context = useContext(ReasoningEffortContext);
  if (!context) {
    throw new Error("useReasoningEffort must be used inside Providers");
  }

  return context;
}

// Harness-Requirement: proj-quartz.knowledge-agent-chat-service
// Harness-Requirement: proj-quartz.reasoning-effort-selector
export function Providers({ children }: { children: React.ReactNode }) {
  const [reasoningEffort, setReasoningEffort] =
    useState<ReasoningEffort>("medium");
  const reasoningEffortRef = useRef<ReasoningEffort>(reasoningEffort);

  useEffect(() => {
    reasoningEffortRef.current = reasoningEffort;
  }, [reasoningEffort]);

  const agents = useMemo(
    () => ({
      default: withReasoningEffort(
        new HttpAgent({
          agentId: "default",
          url: "/api/knowledge-agent",
        }),
        () => reasoningEffortRef.current,
      ),
      "knowledge-agent": withReasoningEffort(
        new HttpAgent({
          agentId: "knowledge-agent",
          url: "/api/knowledge-agent",
        }),
        () => reasoningEffortRef.current,
      ),
    }),
    [],
  );

  const reasoningEffortContext = useMemo(
    () => ({ reasoningEffort, setReasoningEffort }),
    [reasoningEffort],
  );

  return (
    <ReasoningEffortContext.Provider
      value={reasoningEffortContext}
    >
      <CopilotKit
        agents__unsafe_dev_only={agents}
        enableInspector={false}
        showDevConsole={false}
      >
        {children}
      </CopilotKit>
    </ReasoningEffortContext.Provider>
  );
}
