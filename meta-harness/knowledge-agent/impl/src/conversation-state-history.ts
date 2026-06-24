// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.conversation-state: records auditable conversation state history bookkeeping.

import { parseToml } from "../../../librarian/impl/dist/index.js";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { PreparedRuntime } from "./types.js";

type ConversationStateSnapshotPhase = "before" | "after";

type ConversationStateHistorySnapshot = {
  turnId: string;
  phase: ConversationStateSnapshotPhase;
  path: string;
  sha256: string;
  recordedAt: string;
};

/**
 * Records a root-level state history index for audit without duplicating state TOML content.
 */
export async function recordConversationStateHistory(input: {
  runtime: PreparedRuntime;
  turnId: string;
  beforeStateToml: string;
  afterStateToml: string;
  recordedAt: string;
}): Promise<void> {
  const historyPath = join(input.runtime.conversationRoot, "conversation-state-history.toml");
  const existing = await readConversationStateHistory(historyPath);
  const snapshots = existing.filter(
    (snapshot) =>
      snapshot.turnId !== input.turnId ||
      (snapshot.phase !== "before" && snapshot.phase !== "after"),
  );

  snapshots.push(
    buildSnapshot({
      turnId: input.turnId,
      phase: "before",
      path: join("turns", input.turnId, "conversation-state.toml"),
      stateToml: input.beforeStateToml,
      recordedAt: input.recordedAt,
    }),
    buildSnapshot({
      turnId: input.turnId,
      phase: "after",
      path: join("turns", input.turnId, "conversation-state-after.toml"),
      stateToml: input.afterStateToml,
      recordedAt: input.recordedAt,
    }),
  );

  await writeFile(historyPath, renderConversationStateHistory(snapshots));
}

async function readConversationStateHistory(
  path: string,
): Promise<ConversationStateHistorySnapshot[]> {
  let text = "";
  try {
    text = await readFile(path, "utf8");
  } catch (error: unknown) {
    if (isNodeErrorCode(error, "ENOENT")) {
      return [];
    }
    throw error;
  }
  const data = parseToml(text);
  const allowedKeys = new Set(["state_snapshot"]);
  for (const key of Object.keys(data)) {
    if (!allowedKeys.has(key)) {
      throw new Error(`Unknown conversation state history field: ${key}`);
    }
  }
  const snapshots = data.state_snapshot;
  if (snapshots === undefined) {
    return [];
  }
  if (!Array.isArray(snapshots)) {
    throw new Error("conversation state history must use repeated state_snapshot tables");
  }
  return snapshots.map(parseSnapshot);
}

function parseSnapshot(
  value: unknown,
  index: number,
): ConversationStateHistorySnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`state_snapshot[${index}] must be a table`);
  }
  const record = value as Record<string, unknown>;
  const allowedKeys = new Set(["turn_id", "phase", "path", "sha256", "recorded_at"]);
  for (const key of Object.keys(record)) {
    if (!allowedKeys.has(key)) {
      throw new Error(`state_snapshot[${index}] has unsupported field: ${key}`);
    }
  }
  const phase = requiredString(record, "phase", index);
  if (phase !== "before" && phase !== "after") {
    throw new Error(`state_snapshot[${index}].phase must be before or after`);
  }
  return {
    turnId: requiredString(record, "turn_id", index),
    phase,
    path: requiredString(record, "path", index),
    sha256: requiredString(record, "sha256", index),
    recordedAt: requiredString(record, "recorded_at", index),
  };
}

function buildSnapshot(input: {
  turnId: string;
  phase: ConversationStateSnapshotPhase;
  path: string;
  stateToml: string;
  recordedAt: string;
}): ConversationStateHistorySnapshot {
  return {
    turnId: input.turnId,
    phase: input.phase,
    path: input.path,
    sha256: sha256(input.stateToml),
    recordedAt: input.recordedAt,
  };
}

function renderConversationStateHistory(
  snapshots: ConversationStateHistorySnapshot[],
): string {
  const lines = [
    "# Generated conversation state history. Bookkeeping index, not durable knowledge.",
    "# Snapshot content lives in per-turn conversation-state TOML files.",
  ];
  for (const snapshot of snapshots) {
    lines.push(
      "",
      "[[state_snapshot]]",
      `turn_id = ${tomlString(snapshot.turnId)}`,
      `phase = ${tomlString(snapshot.phase)}`,
      `path = ${tomlString(snapshot.path)}`,
      `sha256 = ${tomlString(snapshot.sha256)}`,
      `recorded_at = ${tomlString(snapshot.recordedAt)}`,
    );
  }
  return `${lines.join("\n")}\n`;
}

function requiredString(
  record: Record<string, unknown>,
  key: string,
  index: number,
): string {
  const value = record[key];
  if (typeof value !== "string" || !value) {
    throw new Error(`state_snapshot[${index}].${key} is required`);
  }
  return value;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function tomlString(value: string): string {
  return JSON.stringify(value);
}

function isNodeErrorCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}
