// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.harness-owned-session: persists SDK session history locally.

import type {
  AgentInputItem,
  Session,
  SessionHistoryRewriteArgs,
  SessionHistoryRewriteAwareSession,
} from "@openai/agents";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

/**
 * Stores OpenAI Agents SDK session items as newline-delimited JSON.
 */
export class LocalJsonlSession implements SessionHistoryRewriteAwareSession {
  constructor(
    private readonly sessionId: string,
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
    await this.writeItems([...existing, ...items]);
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
    await this.writeItems(items);
  }

  private async readItems(): Promise<AgentInputItem[]> {
    let text = "";
    try {
      text = await readFile(this.path, "utf8");
    } catch (error: unknown) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
        return [];
      }
      throw error;
    }
    return text
      .split(/\r?\n/)
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line) as AgentInputItem);
  }

  private async writeItems(items: AgentInputItem[]): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    await writeFile(
      this.path,
      items.map((item) => JSON.stringify(item)).join("\n") + (items.length ? "\n" : ""),
    );
  }
}

export type KnowledgeAgentSession = Session;
