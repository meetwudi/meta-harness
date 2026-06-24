// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.conversation-state: validates and renders compact turn-to-turn conversation state.

import {
  parseToml,
  resolveLibraryLocation,
  type LibrarianContext,
} from "../../../librarian/impl/dist/index.js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { PreparedRuntime } from "./types.js";

export type ConversationStateMention = {
  uri: string;
};

export type ConversationState = {
  actorUri: string;
  mentionedGoals: ConversationStateMention[];
  mentionedLibraries: ConversationStateMention[];
};

export type ConversationStateUpdateInput = {
  mentionedGoals?: ConversationStateMention[];
  mentionedLibraries?: ConversationStateMention[];
};

export class ConversationStateRuntime {
  readonly promptToml: string;
  private state: ConversationState;

  constructor(
    private readonly path: string,
    private readonly librarianContext: LibrarianContext,
    state: ConversationState,
  ) {
    this.state = normalizeConversationState(state);
    this.promptToml = renderConversationState(this.state);
  }

  static async create(input: {
    runtime: PreparedRuntime;
    librarianContext: LibrarianContext;
  }): Promise<ConversationStateRuntime> {
    const path = join(input.runtime.conversationRoot, "conversation-state.toml");
    const state = await loadConversationState(path, input.librarianContext.actorUri);
    return new ConversationStateRuntime(path, input.librarianContext, state);
  }

  currentToml(): string {
    return renderConversationState(this.state);
  }

  async persistLatest(): Promise<void> {
    await writeText(this.path, this.currentToml());
  }

  async update(input: ConversationStateUpdateInput): Promise<Record<string, unknown>> {
    assertUpdateShape(input);
    const mentionedGoals = normalizeMentionArray(input.mentionedGoals ?? [], "mentionedGoals");
    const mentionedLibraries = normalizeMentionArray(
      input.mentionedLibraries ?? [],
      "mentionedLibraries",
    );

    for (const mention of mentionedGoals) {
      verifyLibrarySchemeUri(mention.uri, "mentionedGoals.uri");
    }
    for (const mention of mentionedLibraries) {
      await verifyMentionedLibraryUri(this.librarianContext, mention.uri);
    }

    this.state = normalizeConversationState({
      ...this.state,
      mentionedGoals: mergeMentions(this.state.mentionedGoals, mentionedGoals),
      mentionedLibraries: mergeMentions(this.state.mentionedLibraries, mentionedLibraries),
    });
    await this.persistLatest();

    return {
      actorUri: this.state.actorUri,
      mentionedGoalUris: this.state.mentionedGoals.map((mention) => mention.uri),
      mentionedLibraryUris: this.state.mentionedLibraries.map((mention) => mention.uri),
      conversationStateToml: this.currentToml(),
    };
  }
}

async function loadConversationState(path: string, actorUri: string): Promise<ConversationState> {
  let text = "";
  try {
    text = await readFile(path, "utf8");
  } catch (error: unknown) {
    if (isNodeErrorCode(error, "ENOENT")) {
      return emptyConversationState(actorUri);
    }
    throw error;
  }

  const data = parseToml(text);
  const allowedKeys = new Set(["actor_uri", "mentioned_goal", "mentioned_library"]);
  for (const key of Object.keys(data)) {
    if (!allowedKeys.has(key)) {
      throw new Error(`Unknown conversation state field requires Spec approval: ${key}`);
    }
  }

  return normalizeConversationState({
    actorUri: typeof data.actor_uri === "string" ? data.actor_uri : actorUri,
    mentionedGoals: parseMentions(data.mentioned_goal, "mentioned_goal"),
    mentionedLibraries: parseMentions(data.mentioned_library, "mentioned_library"),
  });
}

function emptyConversationState(actorUri: string): ConversationState {
  return normalizeConversationState({
    actorUri,
    mentionedGoals: [],
    mentionedLibraries: [],
  });
}

function normalizeConversationState(state: ConversationState): ConversationState {
  if (!state.actorUri.startsWith("actor://")) {
    throw new Error(`conversation state actor_uri must use actor://: ${state.actorUri}`);
  }
  return {
    actorUri: state.actorUri,
    mentionedGoals: dedupeMentions(normalizeMentionArray(state.mentionedGoals, "mentionedGoals")),
    mentionedLibraries: dedupeMentions(
      normalizeMentionArray(state.mentionedLibraries, "mentionedLibraries"),
    ),
  };
}

function parseMentions(value: unknown, label: string): ConversationStateMention[] {
  if (value === undefined) {
    return [];
  }
  return normalizeMentionArray(value, label);
}

function normalizeMentionArray(value: unknown, label: string): ConversationStateMention[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must use repeated mention tables`);
  }
  return value.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`${label}[${index}] must be a table`);
    }
    const record = item as Record<string, unknown>;
    const keys = Object.keys(record);
    const unexpected = keys.filter((key) => key !== "uri");
    if (unexpected.length) {
      throw new Error(
        `${label}[${index}] has unsupported field(s) requiring Spec approval: ${unexpected.join(", ")}`,
      );
    }
    if (typeof record.uri !== "string" || !record.uri) {
      throw new Error(`${label}[${index}].uri is required`);
    }
    return { uri: record.uri };
  });
}

function assertUpdateShape(input: ConversationStateUpdateInput): void {
  const record = input as Record<string, unknown>;
  const allowedKeys = new Set(["mentionedGoals", "mentionedLibraries"]);
  for (const key of Object.keys(record)) {
    if (!allowedKeys.has(key)) {
      throw new Error(`Unsupported conversation state update field: ${key}`);
    }
  }
}

async function verifyMentionedLibraryUri(
  context: LibrarianContext,
  uri: string,
): Promise<void> {
  const location = await resolveLibraryLocation(context, uri);
  if (location.path || location.library.uri !== uri) {
    throw new Error(`mentioned_library.uri must be an exact resolved Library URI: ${uri}`);
  }
}

function verifyLibrarySchemeUri(uri: string, label: string): void {
  if (uri !== uri.trim()) {
    throw new Error(`${label} must not include surrounding whitespace: ${uri}`);
  }
  if (!uri.startsWith("library://")) {
    throw new Error(`${label} must start with library://: ${uri}`);
  }
  if (uri.endsWith("/")) {
    throw new Error(`${label} must be canonical and must not end with a slash: ${uri}`);
  }
  const segments = uri.slice("library://".length).split("/");
  if (!segments[0]) {
    throw new Error(`${label} must include a Library name: ${uri}`);
  }
  for (const segment of segments.slice(1)) {
    if (!segment || segment === "." || segment === "..") {
      throw new Error(`${label} must use canonical Library-relative path segments: ${uri}`);
    }
  }
}

function mergeMentions(
  existing: ConversationStateMention[],
  incoming: ConversationStateMention[],
): ConversationStateMention[] {
  return dedupeMentions([...existing, ...incoming]);
}

function dedupeMentions(mentions: ConversationStateMention[]): ConversationStateMention[] {
  const seen = new Set<string>();
  const deduped: ConversationStateMention[] = [];
  for (const mention of mentions) {
    if (seen.has(mention.uri)) {
      continue;
    }
    seen.add(mention.uri);
    deduped.push(mention);
  }
  return deduped;
}

/**
 * Callback rule: this TOML schema is the spec-backed conversation state contract.
 * Do not change it or add fields without human approval and a Knowledge Agent Spec update.
 */
export function renderConversationState(state: ConversationState): string {
  const lines = [
    "# Generated conversation state. Runtime metadata, not durable knowledge.",
    "# Callback rule: update next-turn mentions only through conversation_state_update.",
    "# Schema changes require human approval and a Knowledge Agent Spec update.",
    `actor_uri = ${tomlString(state.actorUri)}`,
  ];

  for (const mention of state.mentionedGoals) {
    lines.push("", "[[mentioned_goal]]", `uri = ${tomlString(mention.uri)}`);
  }
  for (const mention of state.mentionedLibraries) {
    lines.push("", "[[mentioned_library]]", `uri = ${tomlString(mention.uri)}`);
  }

  return `${lines.join("\n")}\n`;
}

function tomlString(value: string): string {
  return JSON.stringify(value);
}

async function writeText(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
}

function isNodeErrorCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}
