// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.conversation-state: validates and renders compact turn-to-turn conversation state.
// Supports knowledge-agent.library-scoped-memory-curator: carries transient Memory Curator routing from the state callback.
// Supports knowledge-agent.postgres-runtime-storage: persists state through the runtime storage driver.

import {
  parseToml,
  resolveLibraryLocation,
  type LibrarianContext,
  type LibrarianStorage,
} from "../../../librarian/impl/dist/index.js";
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
  memoryCurationLibraries?: ConversationStateMention[];
};

export class ConversationStateRuntime {
  readonly promptToml: string;
  private state: ConversationState;
  private memoryCurationLibraries: ConversationStateMention[] = [];

  constructor(
    private readonly storage: LibrarianStorage,
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
    const state = await loadConversationState(
      input.runtime.runtimeStorage,
      path,
      input.librarianContext.actorUri,
    );
    return new ConversationStateRuntime(
      input.runtime.runtimeStorage,
      path,
      input.librarianContext,
      state,
    );
  }

  currentToml(): string {
    return renderConversationState(this.state);
  }

  memoryCurationLibraryUris(): string[] {
    return this.memoryCurationLibraries.map((mention) => mention.uri);
  }

  async persistLatest(): Promise<void> {
    await writeText(this.storage, this.path, this.currentToml());
  }

  async update(input: ConversationStateUpdateInput): Promise<Record<string, unknown>> {
    assertUpdateShape(input);
    const hasMemoryCurationLibraries = Object.prototype.hasOwnProperty.call(
      input,
      "memoryCurationLibraries",
    );
    const hasMentionedGoals = Object.prototype.hasOwnProperty.call(input, "mentionedGoals");
    const hasMentionedLibraries = Object.prototype.hasOwnProperty.call(input, "mentionedLibraries");
    const mentionedGoals = hasMentionedGoals
      ? normalizeMentionArray(input.mentionedGoals, "mentionedGoals")
      : [];
    const mentionedLibraries = hasMentionedLibraries
      ? normalizeMentionArray(input.mentionedLibraries, "mentionedLibraries")
      : [];
    const memoryCurationLibraries = hasMemoryCurationLibraries
      ? normalizeMentionArray(input.memoryCurationLibraries, "memoryCurationLibraries")
      : undefined;

    for (const mention of mentionedGoals) {
      verifyLibrarySchemeUri(mention.uri, "mentionedGoals.uri");
    }
    for (const mention of mentionedLibraries) {
      await verifyResolvedLibraryUri(
        this.librarianContext,
        mention.uri,
        "mentionedLibraries.uri",
      );
    }
    for (const mention of memoryCurationLibraries ?? []) {
      await verifyResolvedLibraryUri(
        this.librarianContext,
        mention.uri,
        "memoryCurationLibraries.uri",
      );
    }

    this.state = normalizeConversationState({
      ...this.state,
      mentionedGoals: mergeMentions(this.state.mentionedGoals, mentionedGoals),
      mentionedLibraries: mergeMentions(this.state.mentionedLibraries, mentionedLibraries),
    });
    if (memoryCurationLibraries !== undefined) {
      this.memoryCurationLibraries = dedupeMentions(memoryCurationLibraries);
    }
    await this.persistLatest();

    return {
      actorUri: this.state.actorUri,
      mentionedGoalUris: this.state.mentionedGoals.map((mention) => mention.uri),
      mentionedLibraryUris: this.state.mentionedLibraries.map((mention) => mention.uri),
      memoryCurationLibraryUris: this.memoryCurationLibraryUris(),
      conversationStateToml: this.currentToml(),
    };
  }
}

async function loadConversationState(
  storage: LibrarianStorage,
  path: string,
  actorUri: string,
): Promise<ConversationState> {
  if (!(await storage.exists(path))) {
    return emptyConversationState(actorUri);
  }
  const text = await storage.readText(path);

  const data = parseToml(text);
  const allowedKeys = new Set(["actor_uri", "mentioned_goal", "mentioned_library"]);
  for (const key of Object.keys(data)) {
    if (!allowedKeys.has(key)) {
      throw new Error(`Unknown conversation state field requires Spec approval: ${key}`);
    }
  }

  if (typeof data.actor_uri !== "string" || !data.actor_uri) {
    throw new Error(`${path} is missing required conversation state field: actor_uri`);
  }

  return normalizeConversationState({
    actorUri: data.actor_uri,
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
  const allowedKeys = new Set([
    "mentionedGoals",
    "mentionedLibraries",
    "memoryCurationLibraries",
  ]);
  for (const key of Object.keys(record)) {
    if (!allowedKeys.has(key)) {
      throw new Error(`Unsupported conversation state update field: ${key}`);
    }
  }
}

async function verifyResolvedLibraryUri(
  context: LibrarianContext,
  uri: string,
  label: string,
): Promise<void> {
  const location = await resolveLibraryLocation(context, uri);
  if (location.path || location.library.uri !== uri) {
    throw new Error(`${label} must be an exact resolved Library URI: ${uri}`);
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

async function writeText(
  storage: LibrarianStorage,
  path: string,
  content: string,
): Promise<void> {
  await storage.makeDirectory(dirname(path));
  await storage.writeText(path, content);
}
