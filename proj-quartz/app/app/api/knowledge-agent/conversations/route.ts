import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AgUiConversationMessage = {
  id: string;
  role: "user" | "assistant" | "reasoning";
  content: string;
};

export type ReasoningDeltaRecord = {
  source: string;
  delta: string;
  recordedAt?: string;
};

type StoredReasoningDeltaRecord = ReasoningDeltaRecord & {
  type: "reasoning_delta";
  recordedAt: string;
};

type QuartzConversationSummary = {
  id: string;
  conversationId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages?: AgUiConversationMessage[];
};

class ConversationNotFoundError extends Error {
  constructor(folderName: string) {
    super(`Conversation not found: ${folderName}`);
    this.name = "ConversationNotFoundError";
  }
}

type ConversationTurn = {
  turnId: string;
  startedAt: string;
  latestUserMessage: string;
};

type RuntimeConversationLibrary = {
  storage: LibrarianStorage & { close?: () => Promise<void> };
  root: string;
};

type LibrarianStorage = {
  readText(path: string): Promise<string>;
  writeText(path: string, content: string): Promise<void>;
  deletePath(path: string): Promise<void>;
  makeDirectory(path: string): Promise<void>;
  listDirectory(path: string): Promise<{ name: string; isDirectory: boolean }[]>;
  exists(path: string): Promise<boolean>;
};

type LibrarianStorageModule = {
  createPostgresStorageFromConnectionString(input: {
    connectionString: string;
    schemaName?: string;
    tableName?: string;
    autoEnsureSchema?: boolean;
  }): LibrarianStorage & { close?: () => Promise<void> };
};

type MetaHarnessConfig = {
  project?: {
    localRoot?: string;
    actorUri?: string;
  };
  runtime?: {
    conversationStorage?: {
      driverName?: string;
      connectionStringEnv?: string;
      schemaName?: string;
      tableName?: string;
      autoEnsureSchema?: boolean;
    };
    conversationLibrary?: {
      name?: string;
      rootPath?: string;
    };
  };
};

type RuntimeLibraryConfig = {
  name: string;
  rootPath: string;
};

let quartzProjectEnvLoaded = false;

const libraryNamePattern = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;
const libraryNameFormat = "lowercase letters and digits separated by hyphens or underscores";
const noStoreHeaders = { "Cache-Control": "no-store" };

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return Response.json(body, {
    ...init,
    headers: {
      ...noStoreHeaders,
      ...init?.headers,
    },
  });
}

async function loadLibrarianStorageModule(): Promise<LibrarianStorageModule> {
  const moduleUrl = pathToFileURL(
    resolve(repoRootPath(), "meta-harness/librarian/impl/dist/index.js"),
  ).href;
  return import(/* webpackIgnore: true */ moduleUrl) as Promise<LibrarianStorageModule>;
}

function repoRootPath(): string {
  if (process.env.QUARTZ_REPO_ROOT) {
    return resolve(process.env.QUARTZ_REPO_ROOT);
  }

  return resolve(process.cwd(), "../..");
}

function projectConfigPath(): string {
  return process.env.QUARTZ_PROJECT_CONFIG ?? "proj-quartz/.meta-harness.json";
}

function quartzProjectRootPath(): string {
  return process.env.QUARTZ_PROJECT_ROOT
    ? resolve(process.env.QUARTZ_PROJECT_ROOT)
    : resolve(process.cwd(), "..");
}

function loadQuartzProjectEnv(): void {
  if (quartzProjectEnvLoaded) {
    return;
  }
  // Next dev preloads app-level env; force the project-root Quartz env here.
  loadEnvConfig(quartzProjectRootPath(), process.env.NODE_ENV !== "production", console, true);
  quartzProjectEnvLoaded = true;
}

function resolveProjectConfigPath(repoRoot: string, configPath: string): string {
  return isAbsolute(configPath) ? resolve(configPath) : resolve(repoRoot, configPath);
}

function loadMetaHarnessConfig(repoRoot: string, configPath: string): MetaHarnessConfig {
  return JSON.parse(readFileSync(resolveProjectConfigPath(repoRoot, configPath), "utf8")) as MetaHarnessConfig;
}

function resolveProjectRootPath(repoRoot: string, configPath: string): string {
  return dirname(resolveProjectConfigPath(repoRoot, configPath));
}

function resolveProjectActorUri(config: MetaHarnessConfig): string {
  const actorUri = config.project?.actorUri;
  if (typeof actorUri !== "string" || !actorUri.startsWith("actor://")) {
    throw new Error(".meta-harness.json project.actorUri must use actor://");
  }
  return actorUri;
}

function resolveRuntimeLibraryConfig(
  value: { name?: string; rootPath?: string } | undefined,
  label: string,
): RuntimeLibraryConfig {
  if (!value || typeof value !== "object") {
    throw new Error(`.meta-harness.json ${label} is required`);
  }
  const record = value as Record<string, unknown>;
  if (typeof record.name !== "string" || !libraryNamePattern.test(record.name)) {
    throw new Error(`.meta-harness.json ${label}.name must use ${libraryNameFormat}`);
  }
  if (typeof record.rootPath !== "string" || !record.rootPath.trim()) {
    throw new Error(`.meta-harness.json ${label}.rootPath must be a non-empty string`);
  }
  return {
    name: record.name,
    rootPath: record.rootPath,
  };
}

function resolveLocalRoot(repoRoot: string, input: string): string {
  if (input === "~") {
    return homedir();
  }
  if (input.startsWith("~/")) {
    return resolve(homedir(), input.slice(2));
  }
  if (isAbsolute(input)) {
    return resolve(input);
  }
  return resolve(repoRoot, input);
}

function resolveRuntimeLibraryRootPath(
  value: string,
  values: {
    repoRootPath: string;
    projectRootPath: string;
    localRoot: string;
    tmpStorageLibrariesRoot: string;
  },
): string {
  const replaced = Object.entries(values).reduce(
    (current, [key, replacement]) => current.replaceAll(`{{${key}}}`, replacement),
    value,
  );
  const unresolved = replaced.match(/{{[^}]+}}/);
  if (unresolved) {
    throw new Error(`Unsupported runtime Library root path token: ${unresolved[0]}`);
  }
  return isAbsolute(replaced) ? resolve(replaced) : resolve(values.repoRootPath, replaced);
}

async function ensureConversationsLibrary(
  storage: LibrarianStorage,
  root: string,
  name: string,
  actorUri: string,
): Promise<void> {
  await storage.makeDirectory(root);
  const libraryToml = join(root, "LIBRARY.toml");
  if (!(await storage.exists(libraryToml))) {
    await storage.writeText(
      libraryToml,
      [
        "# This is a Harness primitive.",
        "# See also: library://meta-harness",
        "",
        `name = ${tomlString(name)}`,
        'description = "Conversation history Library for Knowledge Agent sessions, including prompts, summaries, model reasoning records, trace references, and conversation records."',
        "isSystemLibrary = true",
        `read_actors = [${tomlString(actorUri)}]`,
        "update_actors = []",
        "",
      ].join("\n"),
    );
  }
  const memoryToml = join(root, "MEMORY.toml");
  if (!(await storage.exists(memoryToml))) {
    await storage.writeText(
      memoryToml,
      [
        "# This is a Harness primitive.",
        "# See also: library://meta-harness",
        "",
        "instructions = [",
        '  "Store each Knowledge Agent conversation under a timestamped conversation id folder.",',
        '  "Keep prompts, summaries, model reasoning records, trace references, and conversation records together.",',
        '  "Do not store provider credentials.",',
        "]",
        "",
      ].join("\n"),
    );
  }
}

function safeId(value: string, label: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 96);
  if (!cleaned) {
    throw new Error(`${label} must contain at least one URL-safe identifier character.`);
  }
  return cleaned;
}

function conversationIdFromThreadId(threadId: string): string {
  return `quartz-${safeId(threadId, "threadId")}`;
}

function threadIdFromConversationId(conversationId: string): string {
  return conversationId.startsWith("quartz-")
    ? conversationId.slice("quartz-".length)
    : conversationId;
}

function tomlString(value: string): string {
  return JSON.stringify(value);
}

function trimTitle(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "New chat";
  }

  return normalized.length > 54
    ? `${normalized.slice(0, 51).trim()}...`
    : normalized;
}

export async function runtimeStorageFromConfig(
  config: MetaHarnessConfig,
): Promise<LibrarianStorage & { close?: () => Promise<void> }> {
  const runtimeStorage = config.runtime?.conversationStorage;
  if (!runtimeStorage) {
    throw new Error(".meta-harness.json runtime.conversationStorage is required");
  }
  if (runtimeStorage.driverName !== "postgres") {
    throw new Error(
      `.meta-harness.json runtime.conversationStorage must use postgres, got ${runtimeStorage.driverName ?? "<missing>"}`,
    );
  }

  const envName = runtimeStorage.connectionStringEnv ?? "META_HARNESS_POSTGRES_URL";
  const connectionString = process.env[envName];
  if (!connectionString) {
    throw new Error(`Postgres runtime storage requires environment variable: ${envName}`);
  }
  const librarianStorage = await loadLibrarianStorageModule();
  return librarianStorage.createPostgresStorageFromConnectionString({
    connectionString,
    schemaName: runtimeStorage.schemaName,
    tableName: runtimeStorage.tableName,
    autoEnsureSchema: runtimeStorage.autoEnsureSchema,
  });
}

async function loadConversationLibrary(): Promise<RuntimeConversationLibrary> {
  loadQuartzProjectEnv();
  const repoRoot = repoRootPath();
  const configPath = projectConfigPath();
  const config = loadMetaHarnessConfig(repoRoot, configPath);
  const runtimeLibrary = resolveRuntimeLibraryConfig(
    config.runtime?.conversationLibrary,
    "runtime.conversationLibrary",
  );
  const storage = await runtimeStorageFromConfig(config);
  const configuredLocalRoot = config.project?.localRoot;
  if (!configuredLocalRoot) {
    throw new Error(".meta-harness.json project.localRoot is required");
  }

  const localRoot = resolveLocalRoot(repoRoot, configuredLocalRoot);
  const tmpStorageLibrariesRoot = "/libraries";
  const root = resolveRuntimeLibraryRootPath(runtimeLibrary.rootPath, {
    repoRootPath: repoRoot,
    projectRootPath: resolveProjectRootPath(repoRoot, configPath),
    localRoot,
    tmpStorageLibrariesRoot,
  });

  await ensureConversationsLibrary(
    storage,
    root,
    runtimeLibrary.name,
    resolveProjectActorUri(config),
  );

  return { storage, root };
}

function parseTomlStringField(toml: string, fieldName: string): string {
  const escapedFieldName = fieldName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = toml.match(new RegExp(`^${escapedFieldName}\\s*=\\s*"([^"]*)"\\s*$`, "m"));
  return match?.[1] ?? "";
}

function parseRequiredTomlStringField(
  toml: string,
  fieldName: string,
  fileLabel: string,
): string {
  const value = parseTomlStringField(toml, fieldName);
  if (!value) {
    throw new Error(`${fileLabel} is missing required field: ${fieldName}`);
  }
  return value;
}

function parseConversationId(toml: string, fileLabel: string): string {
  return parseRequiredTomlStringField(toml, "conversation_id", fileLabel);
}

function extractField(text: string, label: string, beforeLabels: string[]): string {
  const startMarker = `${label}: `;
  const start = text.indexOf(startMarker);
  if (start < 0) {
    return "";
  }
  const valueStart = start + startMarker.length;
  const rest = text.slice(valueStart);
  const stops = beforeLabels
    .map((nextLabel) => rest.indexOf(`\n\n${nextLabel}:`))
    .filter((index) => index >= 0);
  const value = stops.length ? rest.slice(0, Math.min(...stops)) : rest;
  return value.trim();
}

function outputText(content: unknown): string {
  if (typeof content === "string") {
    return content.trim();
  }
  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((part) => {
      if (
        part
        && typeof part === "object"
        && "type" in part
        && part.type === "output_text"
        && "text" in part
        && typeof part.text === "string"
      ) {
        return part.text.trim();
      }
      return "";
    })
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function parseJsonlRecords(
  jsonl: string,
  fileLabel: string,
): Record<string, unknown>[] {
  return jsonl
    .split(/\r?\n/)
    .flatMap((line, index) => {
      if (!line.trim()) {
        return [];
      }
      try {
        return [JSON.parse(line) as Record<string, unknown>];
      } catch {
        throw new Error(`${fileLabel} line ${index + 1} is malformed JSON.`);
      }
    });
}

function finalAssistantMessages(sessionJsonl: string): string[] {
  return parseJsonlRecords(sessionJsonl, "session.jsonl")
    .filter((item) => {
      const providerData = item.providerData;
      return item.type === "message" &&
        item.role === "assistant" &&
        providerData &&
        typeof providerData === "object" &&
        !Array.isArray(providerData) &&
        (providerData as Record<string, unknown>).phase === "final_answer";
    })
    .map((item) => outputText(item.content))
    .filter(Boolean);
}

function reasoningSourceMarker(source: string): string {
  return `\n\n[[quartz-source:${source}]]\n`;
}

function reasoningCompleteMarker(): string {
  return "\n\n[[quartz-complete]]\n";
}

function safeReasoningSource(value: unknown): string {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : "main";
}

function parseReasoningDeltaRecords(jsonl: string): StoredReasoningDeltaRecord[] {
  return parseJsonlRecords(jsonl, "reasoning.jsonl")
    .map((item, index) => {
      const delta = typeof item.delta === "string" ? item.delta : "";
      if (item.type !== "reasoning_delta") {
        throw new Error(`reasoning.jsonl line ${index + 1} must be a reasoning_delta record.`);
      }
      if (!delta) {
        throw new Error(`reasoning.jsonl line ${index + 1} must include a non-empty delta.`);
      }
      if (typeof item.source !== "string" || !item.source.trim()) {
        throw new Error(`reasoning.jsonl line ${index + 1} must include a source.`);
      }
      return {
        type: "reasoning_delta" as const,
        source: item.source.trim(),
        delta,
        recordedAt: typeof item.recordedAt === "string" ? item.recordedAt : "",
      };
    });
}

export function reasoningContentFromRecords(records: ReasoningDeltaRecord[]): string {
  let content = "";
  let lastSource = "";
  for (const record of records) {
    if (!record.delta) {
      continue;
    }
    const source = safeReasoningSource(record.source);
    if (lastSource !== source) {
      content += reasoningSourceMarker(source);
      lastSource = source;
    }
    content += record.delta;
  }

  return content ? `${content}${reasoningCompleteMarker()}` : "";
}

async function readTurnReasoning(
  storage: LibrarianStorage,
  conversationRoot: string,
  turnId: string,
): Promise<string> {
  const reasoningPath = join(conversationRoot, "turns", turnId, "reasoning.jsonl");
  if (!(await storage.exists(reasoningPath))) {
    return "";
  }

  return reasoningContentFromRecords(
    parseReasoningDeltaRecords(await storage.readText(reasoningPath)),
  );
}

async function readTurnSummaries(
  storage: LibrarianStorage,
  conversationRoot: string,
): Promise<ConversationTurn[]> {
  const turnsRoot = join(conversationRoot, "turns");
  if (!(await storage.exists(turnsRoot))) {
    return [];
  }

  const entries = await storage.listDirectory(turnsRoot);
  const turns: ConversationTurn[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory) {
      continue;
    }
    const summaryPath = join(turnsRoot, entry.name, "summary.md");
    if (!(await storage.exists(summaryPath))) {
      throw new Error(`${join("turns", entry.name, "summary.md")} is missing from conversation history.`);
    }
    const summary = await storage.readText(summaryPath);
    const startedAt = extractField(summary, "Started", [
      "Conversation",
      "User request",
      "Latest user message",
      "Provider",
    ]);
    const latestUserMessage = extractField(summary, "Latest user message", [
      "Provider",
      "Model",
      "Conversation state",
    ]) || extractField(summary, "User request", [
      "Latest user message",
      "Provider",
      "Model",
    ]);
    turns.push({
      turnId: entry.name,
      startedAt,
      latestUserMessage,
    });
  }

  return turns.sort((left, right) =>
    (left.startedAt || left.turnId).localeCompare(right.startedAt || right.turnId),
  );
}

export async function readConversation(input: {
  storage: LibrarianStorage;
  libraryRoot: string;
  folderName: string;
  includeMessages: boolean;
}): Promise<QuartzConversationSummary> {
  const conversationRoot = join(input.libraryRoot, input.folderName);
  if (!(await input.storage.exists(conversationRoot))) {
    throw new ConversationNotFoundError(input.folderName);
  }
  const conversationTomlPath = join(conversationRoot, "CONVERSATION.toml");
  if (!(await input.storage.exists(conversationTomlPath))) {
    throw new Error(`${input.folderName}/CONVERSATION.toml is missing from conversation history.`);
  }

  const conversationToml = await input.storage.readText(conversationTomlPath);
  const conversationId = parseConversationId(
    conversationToml,
    `${input.folderName}/CONVERSATION.toml`,
  );
  const turns = await readTurnSummaries(input.storage, conversationRoot);
  const createdAt = turns[0]?.startedAt ||
    parseTomlStringField(conversationToml, "created_at");
  const updatedAt = turns.at(-1)?.startedAt ||
    parseTomlStringField(conversationToml, "updated_at") ||
    createdAt;
  const title = trimTitle(turns.find((turn) => turn.latestUserMessage)?.latestUserMessage ?? "");
  const summary: QuartzConversationSummary = {
    id: threadIdFromConversationId(conversationId),
    conversationId,
    title,
    createdAt,
    updatedAt,
  };

  if (!input.includeMessages) {
    return summary;
  }

  const sessionPath = join(conversationRoot, "session.jsonl");
  const assistantMessages = (await input.storage.exists(sessionPath))
    ? finalAssistantMessages(await input.storage.readText(sessionPath))
    : [];
  const messages: AgUiConversationMessage[] = [];
  for (const [index, turn] of turns.entries()) {
    if (turn.latestUserMessage) {
      messages.push({
        id: `${turn.turnId}-user`,
        role: "user",
        content: turn.latestUserMessage,
      });
    }
    const reasoningContent = await readTurnReasoning(
      input.storage,
      conversationRoot,
      turn.turnId,
    );
    if (reasoningContent) {
      messages.push({
        id: `${turn.turnId}-reasoning`,
        role: "reasoning",
        content: reasoningContent,
      });
    }
    const assistantText = assistantMessages[index];
    if (assistantText) {
      messages.push({
        id: `${turn.turnId}-assistant`,
        role: "assistant",
        content: assistantText,
      });
    }
  }
  summary.messages = messages;
  return summary;
}

export async function listConversations(input: {
  storage: LibrarianStorage;
  libraryRoot: string;
}): Promise<QuartzConversationSummary[]> {
  const entries = await input.storage.listDirectory(input.libraryRoot);
  const conversations = (
    await Promise.all(
      entries
        .filter((entry) => entry.isDirectory)
        .map((entry) =>
          readConversation({
            storage: input.storage,
            libraryRoot: input.libraryRoot,
            folderName: entry.name,
            includeMessages: false,
          }),
        ),
    )
  );

  return conversations.sort((left, right) => {
    if (left.updatedAt && right.updatedAt) {
      return right.updatedAt.localeCompare(left.updatedAt);
    }
    if (left.updatedAt) {
      return -1;
    }
    if (right.updatedAt) {
      return 1;
    }
    return right.conversationId.localeCompare(left.conversationId);
  });
}

export async function createConversation(input: {
  storage: LibrarianStorage;
  libraryRoot: string;
}): Promise<QuartzConversationSummary> {
  const now = new Date().toISOString();
  const threadId = randomUUID();
  const conversationId = conversationIdFromThreadId(threadId);
  const conversationRoot = join(input.libraryRoot, conversationId);
  await input.storage.makeDirectory(conversationRoot);
  await input.storage.writeText(
    join(conversationRoot, "CONVERSATION.toml"),
    [
      `conversation_id = ${tomlString(conversationId)}`,
      `created_at = ${tomlString(now)}`,
      `updated_at = ${tomlString(now)}`,
      `session_file = ${tomlString("session.jsonl")}`,
      "",
    ].join("\n"),
  );

  return {
    id: threadId,
    conversationId,
    title: "New chat",
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

export async function writeTurnReasoning(input: {
  storage: LibrarianStorage;
  libraryRoot: string;
  conversationId: string;
  turnId: string;
  records: ReasoningDeltaRecord[];
}): Promise<void> {
  const records = input.records.filter((record) => record.delta);
  if (records.length === 0) {
    return;
  }

  const turnRoot = join(input.libraryRoot, input.conversationId, "turns", input.turnId);
  const now = new Date().toISOString();
  await input.storage.makeDirectory(turnRoot);
  await input.storage.writeText(
    join(turnRoot, "reasoning.jsonl"),
    records.map((record) =>
      JSON.stringify({
        type: "reasoning_delta",
        source: safeReasoningSource(record.source),
        delta: record.delta,
        recordedAt: record.recordedAt ?? now,
      } satisfies StoredReasoningDeltaRecord)
    ).join("\n") + "\n",
  );
}

export async function writeThreadTurnReasoning(input: {
  threadId: string;
  turnId: string;
  records: ReasoningDeltaRecord[];
}): Promise<void> {
  if (input.records.length === 0) {
    return;
  }

  let library: RuntimeConversationLibrary | undefined;
  try {
    library = await loadConversationLibrary();
    await writeTurnReasoning({
      storage: library.storage,
      libraryRoot: library.root,
      conversationId: conversationIdFromThreadId(input.threadId),
      turnId: input.turnId,
      records: input.records,
    });
  } finally {
    await library?.storage.close?.();
  }
}

async function deleteRecursively(
  storage: LibrarianStorage,
  path: string,
): Promise<void> {
  if (!(await storage.exists(path))) {
    return;
  }

  for (const entry of await storage.listDirectory(path)) {
    const childPath = join(path, entry.name);
    if (entry.isDirectory) {
      await deleteRecursively(storage, childPath);
    } else {
      await storage.deletePath(childPath);
    }
  }
  await storage.deletePath(path);
}

export async function deleteConversations(input: {
  storage: LibrarianStorage;
  libraryRoot: string;
}): Promise<number> {
  const entries = await input.storage.listDirectory(input.libraryRoot);
  let deleted = 0;
  for (const entry of entries) {
    if (!entry.isDirectory) {
      continue;
    }
    await deleteRecursively(input.storage, join(input.libraryRoot, entry.name));
    deleted += 1;
  }
  return deleted;
}

export async function GET(request: Request) {
  let library: RuntimeConversationLibrary | undefined;
  try {
    library = await loadConversationLibrary();
    const url = new URL(request.url);
    const threadId = url.searchParams.get("threadId");
    if (threadId) {
      const conversationId = conversationIdFromThreadId(threadId);
      try {
        const conversation = await readConversation({
          storage: library.storage,
          libraryRoot: library.root,
          folderName: conversationId,
          includeMessages: true,
        });
        return jsonResponse({ conversation });
      } catch (error) {
        if (error instanceof ConversationNotFoundError) {
          return jsonResponse({ error: "Conversation not found." }, { status: 404 });
        }
        throw error;
      }
    }

    return jsonResponse({
      conversations: await listConversations({
        storage: library.storage,
        libraryRoot: library.root,
      }),
    });
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error
          ? error.message
          : "Conversation history failed.",
      },
      { status: 500 },
    );
  } finally {
    await library?.storage.close?.();
  }
}

export async function DELETE() {
  let library: RuntimeConversationLibrary | undefined;
  try {
    library = await loadConversationLibrary();
    return jsonResponse({
      deleted: await deleteConversations({
        storage: library.storage,
        libraryRoot: library.root,
      }),
    });
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error
          ? error.message
          : "Conversation deletion failed.",
      },
      { status: 500 },
    );
  } finally {
    await library?.storage.close?.();
  }
}

export async function POST() {
  let library: RuntimeConversationLibrary | undefined;
  try {
    library = await loadConversationLibrary();
    return jsonResponse({
      conversation: await createConversation({
        storage: library.storage,
        libraryRoot: library.root,
      }),
    });
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error
          ? error.message
          : "Conversation creation failed.",
      },
      { status: 500 },
    );
  } finally {
    await library?.storage.close?.();
  }
}
