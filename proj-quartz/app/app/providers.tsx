"use client";

import { HttpAgent } from "@ag-ui/client";
import { CopilotKit } from "@copilotkit/react-core/v2";
import { useMemo } from "react";

// Harness-Requirement: proj-quartz.knowledge-agent-chat-service
export function Providers({ children }: { children: React.ReactNode }) {
  const agents = useMemo(
    () => ({
      default: new HttpAgent({
        agentId: "default",
        url: "/api/knowledge-agent",
      }),
      "knowledge-agent": new HttpAgent({
        agentId: "knowledge-agent",
        url: "/api/knowledge-agent",
      }),
    }),
    [],
  );

  return (
    <CopilotKit
      agents__unsafe_dev_only={agents}
      enableInspector={false}
      showDevConsole={false}
    >
      {children}
    </CopilotKit>
  );
}
