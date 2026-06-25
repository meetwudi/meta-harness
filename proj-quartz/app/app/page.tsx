"use client";

import { CopilotChat } from "@copilotkit/react-core/v2";

// Harness-Requirement: proj-quartz.knowledge-agent-chat-service
export default function Page() {
  return (
    <main className="quartz-shell">
      <header className="quartz-topbar">
        <div>
          <p className="quartz-kicker">Customer acquisition</p>
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
            <h2>Customer Knowledge</h2>
            <p>No records yet.</p>
          </section>
          <section>
            <h2>Acquisition</h2>
            <p>Discovery and engagement notes will live here.</p>
          </section>
        </aside>

        <section className="quartz-chat-panel" aria-label="Knowledge Agent chat">
          <div className="quartz-chat-frame">
            <CopilotChat
              agentId="knowledge-agent"
              labels={{
                modalHeaderTitle: "Quartz Knowledge Agent",
                welcomeMessageText: "Start with a customer acquisition question.",
              }}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
