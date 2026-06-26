"use client";

import { CopilotChat } from "@copilotkit/react-core/v2";
import {
  reasoningEfforts,
  useReasoningEffort,
  type ReasoningEffort,
} from "./providers";

// Harness-Requirement: proj-quartz.knowledge-agent-chat-service
// Harness-Requirement: proj-quartz.reasoning-effort-selector
// Harness-Requirement: proj-quartz.information-trading-domain
// Harness-Requirement: proj-quartz.no-legacy-domain-positioning
export default function Page() {
  const { reasoningEffort, setReasoningEffort } = useReasoningEffort();

  return (
    <main className="quartz-shell">
      <header className="quartz-topbar">
        <div>
          <p className="quartz-kicker">Information Trading</p>
          <h1>PROJ-Quartz</h1>
        </div>
        <div className="quartz-status" aria-label="Agent status">
          <span />
          Knowledge Agent
        </div>
      </header>

      <div className="quartz-workspace">
        <aside className="quartz-context" aria-label="Project context">
          <section>
            <h2>Project</h2>
            <p>library://proj-quartz</p>
          </section>
          <section>
            <h2>Information Edge</h2>
            <p>No active theses yet.</p>
          </section>
          <section>
            <h2>Market Cadence</h2>
            <p>Quarterly signals and asymmetry notes will live here.</p>
          </section>
        </aside>

        <section className="quartz-chat-panel" aria-label="Knowledge Agent chat">
          <div className="quartz-chat-frame">
            <div className="quartz-chat-toolbar">
              <label htmlFor="reasoning-effort">Reasoning</label>
              <select
                id="reasoning-effort"
                value={reasoningEffort}
                onChange={(event) =>
                  setReasoningEffort(event.target.value as ReasoningEffort)
                }
              >
                {reasoningEfforts.map((effort) => (
                  <option key={effort} value={effort}>
                    {effort}
                  </option>
                ))}
              </select>
            </div>
            <div className="quartz-chat-body">
              <CopilotChat
                agentId="knowledge-agent"
                labels={{
                  modalHeaderTitle: "Quartz Knowledge Agent",
                  welcomeMessageText: "Start with an information asymmetry question.",
                }}
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
