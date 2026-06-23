// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.goal-primitive: exposes Goal primitive creation to agents.
// Supports knowledge-agent.goal-query-interface: exposes Goal listing to agents.
// Supports knowledge-agent.goal-auditor-agent: exposes Goal audit completion to Goal Auditor agents.
// Supports knowledge-agent.goal-update-interface: exposes shared Goal update and audit request tools.
// Supports knowledge-agent.goal-audit-lifecycle: exposes Goal audit request and completion tools.
// Supports knowledge-agent.goal-shared-interface: exposes shared Goal creation and update tools.

import { tool, type Tool } from "@openai/agents";
import type { LibrarianContext } from "../../../librarian/impl/dist/index.js";
import {
  completeGoalAudit,
  createGoalRecord,
  listGoals,
  requestGoalAudit,
  updateGoal,
} from "./goal-record.js";

export type GoalToolOptions = {
  includeAuditTool?: boolean;
};

/**
 * Creates Goal tools backed by Librarian-governed Library updates.
 */
export function createGoalOpenAITools(
  context: LibrarianContext,
  options: GoalToolOptions = {},
): Tool[] {
  const tools: Tool[] = [
    tool({
      name: "goal_create",
      description: "Create a Library-backed Goal primitive record in a writable Library chosen through Library knowledge.",
      parameters: {
        type: "object",
        properties: {
          libraryUri: { type: "string" },
          name: { type: "string" },
          desiredOutcome: { type: "string" },
          sourceLibrary: { type: "string" },
          summary: { type: "string" },
          frameworkRefs: { type: "array", items: { type: "string" } },
          timeline: { type: "string" },
          clarifications: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                question: { type: "string" },
                answer: { type: "string" },
                status: { type: "string" },
              },
              required: ["question"],
              additionalProperties: false,
            },
          },
        },
        required: ["libraryUri", "desiredOutcome"],
        additionalProperties: false,
      } as never,
      strict: false,
      execute: async (input: unknown) =>
        createGoalRecord(context, objectInput(input) as Parameters<typeof createGoalRecord>[1]),
    }),
    tool({
      name: "goal_update",
      description: "Update Goal current state, evidence, progress, blockers, or clarifications through the Goal primitive record.",
      parameters: {
        type: "object",
        properties: {
          goalUri: { type: "string" },
          state: { type: "string", enum: ["unmet", "met", "blocked", "needs-clarification"] },
          currentStateSummary: { type: "string" },
          evidence: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                uri: { type: "string" },
                summary: { type: "string" },
              },
              required: ["uri", "summary"],
              additionalProperties: false,
            },
          },
          progressSummary: { type: "string" },
          progressEvidenceRefs: { type: "array", items: { type: "string" } },
          blocker: {
            type: "object",
            properties: {
              id: { type: "string" },
              summary: { type: "string" },
              status: { type: "string" },
              evidenceRefs: { type: "array", items: { type: "string" } },
            },
            required: ["summary"],
            additionalProperties: false,
          },
          clarifications: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                question: { type: "string" },
                answer: { type: "string" },
                status: { type: "string" },
              },
              required: ["question"],
              additionalProperties: false,
            },
          },
        },
        required: ["goalUri"],
        additionalProperties: false,
      } as never,
      strict: false,
      execute: async (input: unknown) =>
        updateGoal(context, objectInput(input) as Parameters<typeof updateGoal>[1]),
    }),
    tool({
      name: "goal_request_audit",
      description: "Request independent Goal Auditor judgment for a Goal and record the request in the Goal primitive record.",
      parameters: {
        type: "object",
        properties: {
          goalUri: { type: "string" },
          id: { type: "string" },
          summary: { type: "string" },
          evidenceRefs: { type: "array", items: { type: "string" } },
        },
        required: ["goalUri", "summary"],
        additionalProperties: false,
      } as never,
      strict: false,
      execute: async (input: unknown) =>
        requestGoalAudit(context, objectInput(input) as Parameters<typeof requestGoalAudit>[1]),
    }),
    tool({
      name: "goal_list",
      description: "List visible Goals, optionally filtered by met or unmet state and Library URI patterns.",
      parameters: {
        type: "object",
        properties: {
          libraryUriPatterns: { type: "array", items: { type: "string" } },
          state: { type: "string", enum: ["unmet", "met", "blocked", "needs-clarification"] },
        },
        additionalProperties: false,
      } as never,
      strict: false,
      execute: async (input: unknown) =>
        listGoals(context, objectInput(input) as Parameters<typeof listGoals>[1]),
    }),
  ];

  if (options.includeAuditTool) {
    tools.push(tool({
      name: "goal_complete_audit",
      description: "Complete an independent Goal Auditor audit for a Goal after evaluating the Goal record and evidence.",
      parameters: {
        type: "object",
        properties: {
          goalUri: { type: "string" },
          auditRequestId: { type: "string" },
          signal: { type: "string", enum: ["met", "unmet", "needs-clarification"] },
          summary: { type: "string" },
          gaps: { type: "array", items: { type: "string" } },
          evidenceRefs: { type: "array", items: { type: "string" } },
          okToClose: { type: "boolean" },
        },
        required: ["goalUri", "signal", "summary"],
        additionalProperties: false,
      } as never,
      strict: false,
      execute: async (input: unknown) =>
        completeGoalAudit(context, objectInput(input) as Parameters<typeof completeGoalAudit>[1]),
    }));
  }

  return tools;
}

function objectInput(input: unknown): Record<string, unknown> {
  return input && typeof input === "object" ? input as Record<string, unknown> : {};
}
