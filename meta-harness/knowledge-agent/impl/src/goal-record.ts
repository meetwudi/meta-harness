// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.goal-primitive: creates and updates Library-backed Goal primitive records.
// Supports knowledge-agent.goal-progress-grounding: records Goal progress and evidence in the Goal record.
// Supports knowledge-agent.goal-query-interface: lists met and unmet Goals from Library-backed Goal records.
// Supports knowledge-agent.goal-auditor-agent: records independent Goal Auditor signals.
// Supports knowledge-agent.goal-update-interface: provides shared Goal update and audit request functions.
// Supports knowledge-agent.goal-audit-lifecycle: records audit requests and audit completions.
// Supports knowledge-agent.goal-shared-interface: provides shared Goal creation and update functions.
// Supports knowledge-agent.uses-librarian: routes Goal record reads and writes through Librarian.

import {
  executeLibrarianTool,
  parseToml,
  type LibrarianContext,
  type LibraryListResult,
} from "../../../librarian/impl/dist/index.js";

type TomlTable = Record<string, unknown>;

export type GoalState = "unmet" | "met" | "blocked" | "needs-clarification";
export type GoalAuditSignal = "met" | "unmet" | "needs-clarification";

export type GoalEvidence = {
  id: string;
  uri: string;
  summary: string;
  recordedAt: string;
  recordedByActor: string;
};

export type GoalProgress = {
  id: string;
  summary: string;
  evidenceRefs: string[];
  recordedAt: string;
  recordedByActor: string;
};

export type GoalBlocker = {
  id: string;
  summary: string;
  status: string;
  evidenceRefs: string[];
  recordedAt: string;
  recordedByActor: string;
};

export type GoalClarification = {
  id: string;
  question: string;
  answer: string;
  status: string;
  askedAt: string;
  askedByActor: string;
};

export type GoalAudit = {
  id: string;
  auditRequestId: string;
  auditorActor: string;
  signal: GoalAuditSignal;
  summary: string;
  gaps: string[];
  evidenceRefs: string[];
  okToClose: boolean;
  recordedAt: string;
};

export type GoalAuditRequest = {
  id: string;
  requestedByActor: string;
  summary: string;
  evidenceRefs: string[];
  status: "open" | "completed";
  requestedAt: string;
};

export type GoalRecord = {
  uri: string;
  name: string;
  sourceLibrary: string;
  desiredOutcome: string;
  state: GoalState;
  summary: string;
  createdAt: string;
  createdByActor: string;
  frameworkRefs: string[];
  timeline: string;
  currentState: {
    summary: string;
    updatedAt: string;
    updatedByActor: string;
  };
  evidence: GoalEvidence[];
  progress: GoalProgress[];
  blockers: GoalBlocker[];
  clarifications: GoalClarification[];
  auditRequests: GoalAuditRequest[];
  audits: GoalAudit[];
};

export type GoalCreateInput = {
  libraryUri: string;
  name?: string;
  desiredOutcome: string;
  sourceLibrary?: string;
  summary?: string;
  frameworkRefs?: string[];
  timeline?: string;
  clarifications?: Array<{
    id?: string;
    question: string;
    answer?: string;
    status?: string;
  }>;
};

export type GoalUpdateInput = {
  goalUri: string;
  state?: GoalState;
  currentStateSummary?: string;
  evidence?: Array<{
    id?: string;
    uri: string;
    summary: string;
  }>;
  progressSummary?: string;
  progressEvidenceRefs?: string[];
  blocker?: {
    id?: string;
    summary: string;
    status?: string;
    evidenceRefs?: string[];
  };
  clarifications?: Array<{
    id?: string;
    question: string;
    answer?: string;
    status?: string;
  }>;
};

export type GoalAuditRequestInput = {
  goalUri: string;
  id?: string;
  summary: string;
  evidenceRefs?: string[];
};

export type GoalAuditInput = {
  goalUri: string;
  auditRequestId?: string;
  signal: GoalAuditSignal;
  summary: string;
  gaps?: string[];
  evidenceRefs?: string[];
  okToClose?: boolean;
};

export type GoalListInput = {
  libraryUriPatterns?: string[];
  state?: GoalState;
};

/**
 * Creates a Goal primitive record in a writable Library.
 */
export async function createGoalRecord(
  context: LibrarianContext,
  input: GoalCreateInput,
): Promise<Record<string, unknown>> {
  const now = new Date().toISOString();
  const libraryUri = requiredInputString(input.libraryUri, "libraryUri");
  const desiredOutcome = requiredInputString(input.desiredOutcome, "desiredOutcome");
  const name = input.name?.trim() ? slugify(input.name) : slugify(desiredOutcome);
  const goalUri = joinLibraryUri(libraryUri, `goals/${name}/GOAL.toml`);
  const record: GoalRecord = {
    uri: goalUri,
    name,
    sourceLibrary: input.sourceLibrary?.trim() || libraryUri,
    desiredOutcome,
    state: "unmet",
    summary: input.summary?.trim() || "",
    createdAt: now,
    createdByActor: context.actorUri,
    frameworkRefs: input.frameworkRefs ?? [],
    timeline: input.timeline?.trim() || "",
    currentState: {
      summary: "Goal created.",
      updatedAt: now,
      updatedByActor: context.actorUri,
    },
    evidence: [],
    progress: [],
    blockers: [],
    clarifications: (input.clarifications ?? []).map((clarification, index) => ({
      id: clarification.id?.trim() || `clarification-${index + 1}`,
      question: clarification.question,
      answer: clarification.answer ?? "",
      status: clarification.status ?? (clarification.answer ? "answered" : "open"),
      askedAt: now,
      askedByActor: context.actorUri,
    })),
    auditRequests: [],
    audits: [],
  };
  await writeGoalRecord(context, record);
  return {
    goalUri,
    goal: publicGoal(record),
  };
}

/**
 * Updates evidence, progress, blockers, or clarifications for an existing Goal.
 */
export async function updateGoal(
  context: LibrarianContext,
  input: GoalUpdateInput,
): Promise<Record<string, unknown>> {
  const record = await readGoalRecord(context, requiredInputString(input.goalUri, "goalUri"));
  const now = new Date().toISOString();
  if (input.state) {
    if (input.state === "met") {
      throw new Error("Goal state 'met' must be set by goal_complete_audit after independent Goal Auditor review");
    }
    record.state = input.state;
  }
  if (input.currentStateSummary) {
    record.currentState = {
      summary: input.currentStateSummary,
      updatedAt: now,
      updatedByActor: context.actorUri,
    };
  }
  for (const evidence of input.evidence ?? []) {
    record.evidence.push({
      id: evidence.id?.trim() || nextId("evidence", record.evidence.length),
      uri: evidence.uri,
      summary: evidence.summary,
      recordedAt: now,
      recordedByActor: context.actorUri,
    });
  }
  if (input.progressSummary) {
    record.progress.push({
      id: nextId("progress", record.progress.length),
      summary: input.progressSummary,
      evidenceRefs: input.progressEvidenceRefs ?? [],
      recordedAt: now,
      recordedByActor: context.actorUri,
    });
  }
  if (input.blocker) {
    record.blockers.push({
      id: input.blocker.id?.trim() || nextId("blocker", record.blockers.length),
      summary: input.blocker.summary,
      status: input.blocker.status ?? "open",
      evidenceRefs: input.blocker.evidenceRefs ?? [],
      recordedAt: now,
      recordedByActor: context.actorUri,
    });
  }
  for (const clarification of input.clarifications ?? []) {
    record.clarifications.push({
      id: clarification.id?.trim() || nextId("clarification", record.clarifications.length),
      question: clarification.question,
      answer: clarification.answer ?? "",
      status: clarification.status ?? (clarification.answer ? "answered" : "open"),
      askedAt: now,
      askedByActor: context.actorUri,
    });
  }
  await writeGoalRecord(context, record);
  return {
    goalUri: record.uri,
    goal: publicGoal(record),
  };
}

/**
 * Requests independent Goal Auditor judgment for an existing Goal.
 */
export async function requestGoalAudit(
  context: LibrarianContext,
  input: GoalAuditRequestInput,
): Promise<Record<string, unknown>> {
  const record = await readGoalRecord(context, requiredInputString(input.goalUri, "goalUri"));
  const now = new Date().toISOString();
  const auditRequest: GoalAuditRequest = {
    id: input.id?.trim() || nextId("audit-request", record.auditRequests.length),
    requestedByActor: context.actorUri,
    summary: requiredInputString(input.summary, "summary"),
    evidenceRefs: input.evidenceRefs ?? [],
    status: "open",
    requestedAt: now,
  };
  record.auditRequests.push(auditRequest);
  record.currentState = {
    summary: auditRequest.summary,
    updatedAt: now,
    updatedByActor: context.actorUri,
  };
  await writeGoalRecord(context, record);
  return {
    goalUri: record.uri,
    auditRequest,
    requiresGoalAuditorHandoff: true,
    goalAuditorHandoff: {
      toolName: "transfer_to_Meta_Harness_Goal_Auditor",
      goalUri: record.uri,
      auditRequestId: auditRequest.id,
      requestSummary: auditRequest.summary,
      evidenceRefs: auditRequest.evidenceRefs,
      instruction: "Hand off to the independent Goal Auditor now. Do not report an audit signal until goal_complete_audit has updated the Goal record.",
    },
    goal: publicGoal(record),
  };
}

/**
 * Completes an independent Goal Auditor signal for an existing Goal.
 */
export async function completeGoalAudit(
  context: LibrarianContext,
  input: GoalAuditInput,
): Promise<Record<string, unknown>> {
  const record = await readGoalRecord(context, requiredInputString(input.goalUri, "goalUri"));
  const signal = auditInputSignal(input.signal);
  const summary = requiredInputString(input.summary, "summary");
  const now = new Date().toISOString();
  const okToClose = input.okToClose ?? signal === "met";
  record.audits.push({
    id: nextId("audit", record.audits.length),
    auditRequestId: input.auditRequestId?.trim() || "",
    auditorActor: context.actorUri,
    signal,
    summary,
    gaps: input.gaps ?? [],
    evidenceRefs: input.evidenceRefs ?? [],
    okToClose,
    recordedAt: now,
  });
  record.state = signal === "met" ? "met" : signal;
  if (input.auditRequestId) {
    record.auditRequests = record.auditRequests.map((auditRequest) =>
      auditRequest.id === input.auditRequestId
        ? { ...auditRequest, status: "completed" }
        : auditRequest
    );
  }
  record.currentState = {
    summary,
    updatedAt: now,
    updatedByActor: context.actorUri,
  };
  await writeGoalRecord(context, record);
  return {
    goalUri: record.uri,
    signal,
    okToClose,
    gaps: input.gaps ?? [],
    goal: publicGoal(record),
  };
}

/**
 * Lists Goal records visible to the active actor identities.
 */
export async function listGoals(
  context: LibrarianContext,
  input: GoalListInput = {},
): Promise<Record<string, unknown>> {
  const listOutput = await executeLibrarianTool(context, "librarian_list_libraries", {});
  const libraries = (listOutput as LibraryListResult).libraries ?? [];
  const patterns = input.libraryUriPatterns?.length ? input.libraryUriPatterns : ["library://*"];
  const goals: Array<Record<string, unknown>> = [];

  for (const library of libraries) {
    if (!library.readable || !patterns.some((pattern) => matchesUriPattern(library.uri, pattern))) {
      continue;
    }
    const goalUris = await listGoalRecordUris(context, library.uri);
    for (const goalUri of goalUris) {
      try {
        const goal = await readGoalRecord(context, goalUri);
        if (!input.state || goal.state === input.state) {
          goals.push(publicGoal(goal));
        }
      } catch {
        // Ignore malformed or concurrently removed Goal records during listing.
      }
    }
  }

  return {
    state: input.state ?? "all",
    goals,
  };
}

async function listGoalRecordUris(
  context: LibrarianContext,
  libraryUri: string,
): Promise<string[]> {
  try {
    const result = await executeLibrarianTool(context, "librarian_list_files", {
      uri: joinLibraryUri(libraryUri, "goals"),
      recursive: true,
    }) as { files?: Array<{ uri?: unknown }> };
    return (result.files ?? [])
      .map((file) => typeof file.uri === "string" ? file.uri : "")
      .filter((uri) => uri.endsWith("/GOAL.toml"));
  } catch {
    return [];
  }
}

async function readGoalRecord(
  context: LibrarianContext,
  goalUri: string,
): Promise<GoalRecord> {
  const output = await executeLibrarianTool(context, "librarian_read", { uri: goalUri });
  const content = String((output as { content?: unknown }).content ?? "");
  return parseGoalToml(goalUri, content);
}

async function writeGoalRecord(
  context: LibrarianContext,
  record: GoalRecord,
): Promise<void> {
  await executeLibrarianTool(context, "librarian_update", {
    uri: record.uri,
    content: formatGoalToml(record),
  });
}

function parseGoalToml(uri: string, content: string): GoalRecord {
  const data = parseToml(content);
  const currentState = table(data.current_state);
  return {
    uri,
    name: requiredString(data, "name"),
    sourceLibrary: requiredString(data, "source_library"),
    desiredOutcome: requiredString(data, "desired_outcome"),
    state: goalState(requiredString(data, "state")),
    summary: optionalString(data, "summary"),
    createdAt: optionalString(data, "created_at"),
    createdByActor: optionalString(data, "created_by_actor"),
    frameworkRefs: stringArray(data.framework_refs),
    timeline: optionalString(data, "timeline"),
    currentState: {
      summary: optionalString(currentState, "summary"),
      updatedAt: optionalString(currentState, "updated_at"),
      updatedByActor: optionalString(currentState, "updated_by_actor"),
    },
    evidence: arrayTables(data.evidence).map((item) => ({
      id: requiredString(item, "id"),
      uri: requiredString(item, "uri"),
      summary: requiredString(item, "summary"),
      recordedAt: optionalString(item, "recorded_at"),
      recordedByActor: optionalString(item, "recorded_by_actor"),
    })),
    progress: arrayTables(data.progress).map((item) => ({
      id: requiredString(item, "id"),
      summary: requiredString(item, "summary"),
      evidenceRefs: stringArray(item.evidence_refs),
      recordedAt: optionalString(item, "recorded_at"),
      recordedByActor: optionalString(item, "recorded_by_actor"),
    })),
    blockers: arrayTables(data.blockers).map((item) => ({
      id: requiredString(item, "id"),
      summary: requiredString(item, "summary"),
      status: optionalString(item, "status") || "open",
      evidenceRefs: stringArray(item.evidence_refs),
      recordedAt: optionalString(item, "recorded_at"),
      recordedByActor: optionalString(item, "recorded_by_actor"),
    })),
    clarifications: arrayTables(data.clarifications).map((item) => ({
      id: requiredString(item, "id"),
      question: requiredString(item, "question"),
      answer: optionalString(item, "answer"),
      status: optionalString(item, "status") || "open",
      askedAt: optionalString(item, "asked_at"),
      askedByActor: optionalString(item, "asked_by_actor"),
    })),
    auditRequests: arrayTables(data.audit_requests).map((item) => ({
      id: requiredString(item, "id"),
      requestedByActor: requiredString(item, "requested_by_actor"),
      summary: requiredString(item, "summary"),
      evidenceRefs: stringArray(item.evidence_refs),
      status: optionalString(item, "status") === "completed" ? "completed" : "open",
      requestedAt: optionalString(item, "requested_at"),
    })),
    audits: arrayTables(data.audits).map((item) => ({
      id: requiredString(item, "id"),
      auditRequestId: optionalString(item, "audit_request_id"),
      auditorActor: requiredString(item, "auditor_actor"),
      signal: auditSignal(requiredString(item, "signal")),
      summary: requiredString(item, "summary"),
      gaps: stringArray(item.gaps),
      evidenceRefs: stringArray(item.evidence_refs),
      okToClose: Boolean(item.ok_to_close),
      recordedAt: optionalString(item, "recorded_at"),
    })),
  };
}

function formatGoalToml(record: GoalRecord): string {
  return [
    "# This is a Harness primitive.",
    "# See also: library://meta-harness",
    "",
    `name = ${tomlString(record.name)}`,
    `source_library = ${tomlString(record.sourceLibrary)}`,
    `desired_outcome = ${tomlString(record.desiredOutcome)}`,
    `state = ${tomlString(record.state)}`,
    record.summary ? `summary = ${tomlString(record.summary)}` : "",
    record.createdAt ? `created_at = ${tomlString(record.createdAt)}` : "",
    record.createdByActor ? `created_by_actor = ${tomlString(record.createdByActor)}` : "",
    `framework_refs = ${tomlStringArray(record.frameworkRefs)}`,
    record.timeline ? `timeline = ${tomlString(record.timeline)}` : "",
    "",
    "[current_state]",
    `summary = ${tomlString(record.currentState.summary)}`,
    `updated_at = ${tomlString(record.currentState.updatedAt)}`,
    `updated_by_actor = ${tomlString(record.currentState.updatedByActor)}`,
    "",
    ...record.evidence.flatMap((item) => [
      "[[evidence]]",
      `id = ${tomlString(item.id)}`,
      `uri = ${tomlString(item.uri)}`,
      `summary = ${tomlString(item.summary)}`,
      `recorded_at = ${tomlString(item.recordedAt)}`,
      `recorded_by_actor = ${tomlString(item.recordedByActor)}`,
      "",
    ]),
    ...record.progress.flatMap((item) => [
      "[[progress]]",
      `id = ${tomlString(item.id)}`,
      `summary = ${tomlString(item.summary)}`,
      `evidence_refs = ${tomlStringArray(item.evidenceRefs)}`,
      `recorded_at = ${tomlString(item.recordedAt)}`,
      `recorded_by_actor = ${tomlString(item.recordedByActor)}`,
      "",
    ]),
    ...record.blockers.flatMap((item) => [
      "[[blockers]]",
      `id = ${tomlString(item.id)}`,
      `summary = ${tomlString(item.summary)}`,
      `status = ${tomlString(item.status)}`,
      `evidence_refs = ${tomlStringArray(item.evidenceRefs)}`,
      `recorded_at = ${tomlString(item.recordedAt)}`,
      `recorded_by_actor = ${tomlString(item.recordedByActor)}`,
      "",
    ]),
    ...record.clarifications.flatMap((item) => [
      "[[clarifications]]",
      `id = ${tomlString(item.id)}`,
      `question = ${tomlString(item.question)}`,
      `answer = ${tomlString(item.answer)}`,
      `status = ${tomlString(item.status)}`,
      `asked_at = ${tomlString(item.askedAt)}`,
      `asked_by_actor = ${tomlString(item.askedByActor)}`,
      "",
    ]),
    ...record.auditRequests.flatMap((item) => [
      "[[audit_requests]]",
      `id = ${tomlString(item.id)}`,
      `requested_by_actor = ${tomlString(item.requestedByActor)}`,
      `summary = ${tomlString(item.summary)}`,
      `evidence_refs = ${tomlStringArray(item.evidenceRefs)}`,
      `status = ${tomlString(item.status)}`,
      `requested_at = ${tomlString(item.requestedAt)}`,
      "",
    ]),
    ...record.audits.flatMap((item) => [
      "[[audits]]",
      `id = ${tomlString(item.id)}`,
      `audit_request_id = ${tomlString(item.auditRequestId)}`,
      `auditor_actor = ${tomlString(item.auditorActor)}`,
      `signal = ${tomlString(item.signal)}`,
      `summary = ${tomlString(item.summary)}`,
      `gaps = ${tomlStringArray(item.gaps)}`,
      `evidence_refs = ${tomlStringArray(item.evidenceRefs)}`,
      `ok_to_close = ${item.okToClose ? "true" : "false"}`,
      `recorded_at = ${tomlString(item.recordedAt)}`,
      "",
    ]),
  ].filter((line, index, lines) => line || lines[index - 1]).join("\n");
}

function publicGoal(record: GoalRecord): Record<string, unknown> {
  return {
    uri: record.uri,
    name: record.name,
    desiredOutcome: record.desiredOutcome,
    state: record.state,
    currentState: record.currentState,
    evidenceCount: record.evidence.length,
    progressCount: record.progress.length,
    blockerCount: record.blockers.length,
    clarificationCount: record.clarifications.length,
    auditRequestCount: record.auditRequests.length,
    latestAuditRequest: record.auditRequests.at(-1) ?? null,
    latestAudit: record.audits.at(-1) ?? null,
  };
}

function joinLibraryUri(libraryUri: string, path: string): string {
  return `${libraryUri.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "goal";
}

function requiredInputString(value: string | undefined, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Goal tool input requires ${label}`);
  }
  return value.trim();
}

function nextId(prefix: string, existingCount: number): string {
  return `${prefix}-${existingCount + 1}`;
}

function matchesUriPattern(uri: string, pattern: string): boolean {
  const regex = new RegExp(`^${pattern.split("*").map(escapeRegex).join(".*")}$`);
  return regex.test(uri);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function requiredString(data: TomlTable, key: string): string {
  const value = data[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Goal record is missing string field: ${key}`);
  }
  return value;
}

function optionalString(data: TomlTable, key: string): string {
  const value = data[key];
  return typeof value === "string" ? value : "";
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function table(value: unknown): TomlTable {
  return value && typeof value === "object" && !Array.isArray(value) ? value as TomlTable : {};
}

function arrayTables(value: unknown): TomlTable[] {
  return Array.isArray(value)
    ? value.filter((item): item is TomlTable => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
}

function goalState(value: string): GoalState {
  if (value === "met" || value === "blocked" || value === "needs-clarification") {
    return value;
  }
  return "unmet";
}

function auditSignal(value: string): GoalAuditSignal {
  if (value === "met" || value === "needs-clarification") {
    return value;
  }
  return "unmet";
}

function auditInputSignal(value: string): GoalAuditSignal {
  if (value === "met" || value === "unmet" || value === "needs-clarification") {
    return value;
  }
  throw new Error(`Goal audit signal must be met, unmet, or needs-clarification: ${value}`);
}

function tomlString(value: string): string {
  return JSON.stringify(value);
}

function tomlStringArray(values: string[]): string {
  return `[${values.map(tomlString).join(", ")}]`;
}
