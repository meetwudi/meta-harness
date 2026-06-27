"use client";

import {
  CopilotChat,
  type CopilotChatInputProps,
} from "@copilotkit/react-core/v2";
import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import {
  reasoningEfforts,
  useModelSelection,
  useReasoningEffort,
  type ReasoningEffort,
} from "./providers";

type QuartzChatInputProps = Parameters<
  NonNullable<CopilotChatInputProps["children"]>
>[0];

function reasoningEffortLabel(reasoningEffort: ReasoningEffort) {
  if (reasoningEffort === "xhigh") {
    return "Extra High";
  }

  return reasoningEffort
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

type QuartzSelectorOption = {
  id: string;
  label: string;
};

function QuartzComposerSelector({
  value,
  options,
  fallbackLabel,
  menuLabel,
  disabled = false,
  onSelect,
}: {
  value: string | null;
  options: QuartzSelectorOption[];
  fallbackLabel: string;
  menuLabel: string;
  disabled?: boolean;
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const controlRef = useRef<HTMLDivElement | null>(null);
  const selectedOption = options.find((option) => option.id === value);
  const label = selectedOption?.label ?? fallbackLabel;

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!controlRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="quartz-selector-control" ref={controlRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className="quartz-selector-trigger"
        disabled={disabled || options.length === 0}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{label}</span>
        <ChevronDown aria-hidden="true" size={14} strokeWidth={2.2} />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={menuLabel}
          className="quartz-selector-menu"
        >
          {options.map((option) => {
            const selected = option.id === value;
            return (
              <button
                key={option.id}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                className="quartz-selector-option"
                onClick={() => {
                  onSelect(option.id);
                  setOpen(false);
                }}
              >
                <span>{option.label}</span>
                {selected ? (
                  <Check aria-hidden="true" size={14} strokeWidth={2.4} />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function QuartzModelControl() {
  const { modelOptions, selectedModel, setSelectedModel } = useModelSelection();

  return (
    <QuartzComposerSelector
      value={selectedModel}
      options={modelOptions}
      fallbackLabel="Model"
      menuLabel="Model"
      disabled={modelOptions.length === 0}
      onSelect={setSelectedModel}
    />
  );
}

function QuartzReasoningControl() {
  const { reasoningEffort, setReasoningEffort } = useReasoningEffort();
  const options = reasoningEfforts.map((effort) => ({
    id: effort,
    label: reasoningEffortLabel(effort),
  }));

  return (
    <QuartzComposerSelector
      value={reasoningEffort}
      options={options}
      fallbackLabel="Reasoning"
      menuLabel="Reasoning effort"
      onSelect={(effort) => setReasoningEffort(effort as ReasoningEffort)}
    />
  );
}

function QuartzChatInput({
  textArea,
  addMenuButton,
  startTranscribeButton,
  cancelTranscribeButton,
  finishTranscribeButton,
  sendButton,
  audioRecorder,
  disclaimer,
  mode,
  showDisclaimer,
}: QuartzChatInputProps) {
  return (
    <div className="quartz-composer-shell">
      {audioRecorder}
      <div className="quartz-composer">
        <div className="quartz-composer-add">{addMenuButton}</div>
        <div className="quartz-composer-input">{textArea}</div>
        <div className="quartz-composer-actions">
          {mode === "transcribe" ? (
            <>
              {cancelTranscribeButton}
              {finishTranscribeButton}
            </>
          ) : (
            <>
              <QuartzModelControl />
              <QuartzReasoningControl />
              {startTranscribeButton}
              {sendButton}
            </>
          )}
        </div>
      </div>
      {showDisclaimer ? (
        <div className="quartz-composer-disclaimer">{disclaimer}</div>
      ) : null}
    </div>
  );
}

// Harness-Requirement: proj-quartz.knowledge-agent-chat-service
// Harness-Requirement: proj-quartz.reasoning-effort-selector
// Harness-Requirement: proj-quartz.chatgpt-style-reasoning-control
// Harness-Requirement: proj-quartz.model-selector
// Harness-Requirement: proj-quartz.vendored-chat-surface
// Harness-Requirement: proj-quartz.quartz-agent-actor
// Harness-Requirement: proj-quartz.memory-curator-actor
// Harness-Requirement: proj-quartz.information-trading-domain
// Harness-Requirement: proj-quartz.no-legacy-domain-positioning
export default function Page() {
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
            <h2>Agent</h2>
            <p>actor://proj-quartz/agent</p>
          </section>
          <section>
            <h2>Memory Curator</h2>
            <p>actor://proj-quartz/memory-curator</p>
          </section>
        </aside>

        <section className="quartz-chat-panel" aria-label="Knowledge Agent chat">
          <div className="quartz-chat-frame">
            <div className="quartz-chat-body">
              <CopilotChat
                agentId="knowledge-agent"
                input={{ children: QuartzChatInput }}
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
