// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.harness-owned-session: persists SDK session history locally.
// Supports knowledge-agent.postgres-runtime-storage: stores session history through the runtime storage driver.

import type {
  AgentInputItem,
  Session,
  SessionHistoryRewriteArgs,
  SessionHistoryRewriteAwareSession,
} from "@openai/agents";
import { dirname } from "node:path";
import type { LibrarianStorage } from "../../../librarian/impl/dist/index.js";

/**
 * Stores OpenAI Agents SDK session items as newline-delimited JSON.
 */
export class LocalJsonlSession implements SessionHistoryRewriteAwareSession {
  private readonly secretValues = new Set<string>();

  constructor(
    private readonly sessionId: string,
    private readonly storage: LibrarianStorage,
    private readonly path: string,
  ) {}

  async getSessionId(): Promise<string> {
    return this.sessionId;
  }

  async getItems(limit?: number): Promise<AgentInputItem[]> {
    const items = await this.readItems();
    return limit === undefined ? items : items.slice(Math.max(0, items.length - limit));
  }

  async addItems(items: AgentInputItem[]): Promise<void> {
    const existing = await this.readItems();
    this.captureSecretValues(items);
    await this.writeItems(this.redactItems([...existing, ...items]));
  }

  async popItem(): Promise<AgentInputItem | undefined> {
    const items = await this.readItems();
    const item = items.pop();
    await this.writeItems(items);
    return item;
  }

  async clearSession(): Promise<void> {
    await this.writeItems([]);
  }

  async applyHistoryMutations(args: SessionHistoryRewriteArgs): Promise<void> {
    const items = await this.readItems();
    for (const mutation of args.mutations) {
      if (mutation.type !== "replace_function_call") {
        continue;
      }
      const index = items.findIndex(
        (item) =>
          typeof item === "object" &&
          item !== null &&
          "type" in item &&
          item.type === "function_call" &&
          "callId" in item &&
          item.callId === mutation.callId,
      );
      if (index >= 0) {
        items[index] = mutation.replacement as AgentInputItem;
      }
    }
    this.captureSecretValues(items);
    await this.writeItems(this.redactItems(items));
  }

  redactText(text: string): string {
    return redactString(text, this.secretValues);
  }

  private async readItems(): Promise<AgentInputItem[]> {
    if (!(await this.storage.exists(this.path))) {
      return [];
    }
    const text = await this.storage.readText(this.path);
    return text
      .split(/\r?\n/)
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line) as AgentInputItem);
  }

  private async writeItems(items: AgentInputItem[]): Promise<void> {
    await this.storage.makeDirectory(dirname(this.path));
    await this.storage.writeText(
      this.path,
      items.map((item) => JSON.stringify(item)).join("\n") + (items.length ? "\n" : ""),
    );
  }

  private captureSecretValues(items: AgentInputItem[]): void {
    for (const item of items) {
      collectSecretValues(item, this.secretValues);
    }
  }

  private redactItems(items: AgentInputItem[]): AgentInputItem[] {
    return items.map((item) =>
      redactSecretValue(item, this.secretValues) as AgentInputItem
    );
  }
}

export type KnowledgeAgentSession = Session;

export function redactTextWithSessionSecrets(
  session: KnowledgeAgentSession,
  text: string,
): string {
  const redactingSession = session as { redactText?: unknown };
  if (typeof redactingSession.redactText !== "function") {
    return text;
  }
  return redactingSession.redactText(text);
}

const redactedSecret = "[redacted secret]";

function collectSecretValues(value: unknown, secrets: Set<string>): void {
  if (typeof value === "string") {
    collectSecretValuesFromJson(value, secrets);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectSecretValues(item, secrets);
    }
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  if (
    value.name === "quartz_secret" &&
    typeof value.arguments === "string"
  ) {
    collectQuartzSecretArguments(value.arguments, secrets);
  }
  if (typeof value.output === "string") {
    collectSecretValuesFromJson(value.output, secrets);
  }
  if (
    value.sensitivity === "secret_reveal" &&
    typeof value.secret_value === "string"
  ) {
    addSecretValue(value.secret_value, secrets);
  }
  for (const [key, item] of Object.entries(value)) {
    if ((key === "secret_value" || key === "secretValue") && typeof item === "string") {
      addSecretValue(item, secrets);
      continue;
    }
    collectSecretValues(item, secrets);
  }
}

function collectQuartzSecretArguments(raw: string, secrets: Set<string>): void {
  const parsed = parseJsonRecord(raw);
  if (
    parsed?.operation === "store" &&
    typeof parsed.value === "string"
  ) {
    addSecretValue(parsed.value, secrets);
  }
}

function collectSecretValuesFromJson(raw: string, secrets: Set<string>): void {
  const parsed = parseJsonValue(raw);
  if (parsed !== undefined) {
    collectSecretValues(parsed, secrets);
  }
}

function addSecretValue(value: string, secrets: Set<string>): void {
  if (value && value !== redactedSecret) {
    secrets.add(value);
  }
}

function redactSecretValue(value: unknown, secrets: Set<string>): unknown {
  if (typeof value === "string") {
    return redactString(value, secrets);
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactSecretValue(item, secrets));
  }
  if (!isRecord(value)) {
    return value;
  }
  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === "secret_value" || key === "secretValue") {
      output[key] = typeof item === "string" ? redactedSecret : redactSecretValue(item, secrets);
      continue;
    }
    if (
      (key === "arguments" || key === "output") &&
      typeof item === "string"
    ) {
      output[key] = redactJsonString(item, secrets);
      continue;
    }
    output[key] = redactSecretValue(item, secrets);
  }
  return output;
}

function redactJsonString(value: string, secrets: Set<string>): string {
  const parsed = parseJsonValue(value);
  if (parsed === undefined) {
    return redactString(value, secrets);
  }
  return JSON.stringify(redactSecretValue(parsed, secrets));
}

function redactString(value: string, secrets: Set<string>): string {
  let output = value;
  for (const secret of secrets) {
    output = output.split(secret).join(redactedSecret);
  }
  return output;
}

function parseJsonRecord(value: string): Record<string, unknown> | undefined {
  const parsed = parseJsonValue(value);
  return isRecord(parsed) ? parsed : undefined;
}

function parseJsonValue(value: string): unknown | undefined {
  const trimmed = value.trim();
  if (!trimmed || !/^[{["0-9tfn-]/.test(trimmed)) {
    return undefined;
  }
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
