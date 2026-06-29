// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.goal-auditor-agent: creates an independent Goal Auditor handoff agent.
// Supports knowledge-agent.prompt-calls-librarian-intro: gives the auditor the shared starter prompt.
// Supports knowledge-agent.provider-stream-events: requests safe reasoning summaries for Goal Auditor streaming.

import type { LibrarianContext } from "../../../librarian/impl/dist/index.js";
import {
  handoff,
  user,
  type Handoff,
  type HandoffInputData,
  type TextOutput,
} from "@openai/agents";
import { RECOMMENDED_PROMPT_PREFIX } from "@openai/agents-core/extensions";
import { type Manifest, SandboxAgent } from "@openai/agents/sandbox";
import { buildKnowledgeAgentPrompt } from "./build-knowledge-agent-prompt.js";
import { createGoalAuditorLibrarianContext } from "./create-goal-auditor-librarian-context.js";
import { createGoalOpenAITools } from "./create-goal-openai-tools.js";
import { createLibrarianOpenAITools } from "./create-librarian-openai-tools.js";
import { knowledgeAgentCapabilities } from "./knowledge-agent-capabilities.js";
import { openAIReasoningSettings } from "./openai-reasoning-settings.js";
import type { ReasoningEffort } from "./types.js";

const GOAL_AUDITOR_ACTOR_URI = "actor://goal-auditor";

type GoalAuditHandoffInput = {
  goalUri: string;
  auditRequestId: string;
  requestSummary: string;
  evidenceRefs: string[];
  evidenceUris: string[];
};

/**
 * Creates the independent Goal Auditor handoff agent.
 */
export function createGoalAuditorHandoffAgent(input: {
  repoRoot: string;
  goal: string;
  model: string;
  reasoningEffort: ReasoningEffort;
  manifest: Manifest;
  librarianContext: LibrarianContext;
}): Handoff<unknown, TextOutput> {
  const auditorContext = createGoalAuditorLibrarianContext(
    input.librarianContext,
    GOAL_AUDITOR_ACTOR_URI,
  );
  const auditorPrompt = buildKnowledgeAgentPrompt({
    repoRoot: input.repoRoot,
    goal: input.goal,
    goalAudit: {
      actorUri: GOAL_AUDITOR_ACTOR_URI,
    },
  });
  const auditorAgent = new SandboxAgent({
    name: "Meta Harness Goal Auditor",
    handoffDescription: "Audit whether a Meta Harness Goal is met and record an independent audit signal.",
    model: input.model,
    modelSettings: {
      reasoning: openAIReasoningSettings(input.reasoningEffort),
    },
    instructions: [
      RECOMMENDED_PROMPT_PREFIX,
      auditorPrompt,
    ].join("\n\n"),
    tools: [
      ...createLibrarianOpenAITools(auditorContext),
      ...createGoalOpenAITools(auditorContext, { includeAuditTool: true }),
    ],
    defaultManifest: input.manifest,
    capabilities: knowledgeAgentCapabilities({ allowShell: false }),
  });
  let auditInput: GoalAuditHandoffInput | undefined;
  return handoff(auditorAgent, {
    toolDescriptionOverride: [
      "Transfer exactly one open Goal audit request to the independent Meta Harness Goal Auditor.",
      "Use this immediately after goal_request_audit.",
      "Provide the Goal URI, audit request id, request summary, and evidence refs from the audit request.",
      "The Knowledge Agent must not claim an audit signal itself.",
    ].join(" "),
    inputType: {
      type: "object",
      properties: {
        goalUri: { type: "string" },
        auditRequestId: { type: "string" },
        requestSummary: { type: "string" },
        evidenceRefs: { type: "array", items: { type: "string" } },
        evidenceUris: { type: "array", items: { type: "string" } },
      },
      required: ["goalUri", "auditRequestId", "requestSummary", "evidenceRefs", "evidenceUris"],
      additionalProperties: false,
    },
    onHandoff: (_context, parsedInput) => {
      auditInput = parseGoalAuditHandoffInput(parsedInput);
    },
    inputFilter: (handoffInputData) =>
      filterGoalAuditHandoffInput(handoffInputData, auditorPrompt, auditInput),
  });
}

function filterGoalAuditHandoffInput(
  handoffInputData: HandoffInputData,
  auditorPrompt: string,
  auditInput: GoalAuditHandoffInput | undefined,
): HandoffInputData {
  return {
    ...handoffInputData,
    inputHistory: [
      user(auditorPrompt),
      user(formatGoalAuditInput(auditInput)),
    ],
    preHandoffItems: [],
    newItems: [],
  };
}

function parseGoalAuditHandoffInput(input: unknown): GoalAuditHandoffInput {
  const data = input && typeof input === "object" ? input as Record<string, unknown> : {};
  return {
    goalUri: stringValue(data.goalUri),
    auditRequestId: stringValue(data.auditRequestId),
    requestSummary: stringValue(data.requestSummary),
    evidenceRefs: Array.isArray(data.evidenceRefs)
      ? data.evidenceRefs.filter((item): item is string => typeof item === "string")
      : [],
    evidenceUris: Array.isArray(data.evidenceUris)
      ? data.evidenceUris.filter((item): item is string => typeof item === "string")
      : [],
  };
}

function formatGoalAuditInput(input: GoalAuditHandoffInput | undefined): string {
  if (!input) {
    return [
      "Audit request payload was not provided.",
      "Do not infer an audit result.",
      "Use Librarian to inspect open Goals only if the human explicitly asked for a broader audit.",
    ].join("\n");
  }
  return [
    "Audit this Goal request.",
    "",
    `Goal URI: ${input.goalUri}`,
    `Audit request id: ${input.auditRequestId}`,
    `Request summary: ${input.requestSummary}`,
    `Evidence refs: ${input.evidenceRefs.join(", ") || "(none provided)"}`,
    `Evidence Library URIs: ${input.evidenceUris.join(", ") || "(none provided)"}`,
    "",
    "First call librarian_intro, then call librarian_list_libraries.",
    "Then read library://meta-harness/primitives/GOAL.md.",
    "Then read the Goal record through Librarian, read the Evidence Library URIs through Librarian, and call goal_complete_audit.",
    "Do not use shell or sandbox filesystem tools to inspect Goal evidence.",
    "Return only the recorded signal, whether it is OK to close, gaps if any, and the Goal URI.",
  ].join("\n");
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}
