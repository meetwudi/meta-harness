// Generated file. Do not edit directly; update the Spec first.
// Harness-Requirement: librarian.driver-change-set-application
// Harness-Requirement: change-sets.persistent-change-sets

import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import type {
  LibrarianStorage,
  StorageChangeSetApplyResult,
  StorageChangeSetBaseline,
  StorageChangeSetListInput,
  StorageChangeSetPreview,
  StorageChangeSetTextChange,
  StoragePersistedChangeSet,
} from "./types.js";

/**
 * Reads baseline evidence for a text resource from a storage driver.
 */
export async function readStorageChangeSetBaseline(
  storage: LibrarianStorage,
  path: string,
): Promise<StorageChangeSetBaseline> {
  const content = await storage.readText(path);
  return {
    content,
    sha256: sha256Text(content),
    bytes: Buffer.byteLength(content, "utf8"),
  };
}

/**
 * Previews whether text-resource changes match current storage baselines.
 */
export async function previewStorageChangeSetApply(
  storage: LibrarianStorage,
  changes: StorageChangeSetTextChange[],
): Promise<StorageChangeSetPreview> {
  const conflicts = [];
  for (const change of changes) {
    const current = await readStorageChangeSetBaseline(storage, change.path);
    if (current.sha256 !== change.baselineSha256) {
      conflicts.push({
        path: change.path,
        baselineSha256: change.baselineSha256,
        currentSha256: current.sha256,
      });
    }
  }
  return { clean: conflicts.length === 0, conflicts };
}

/**
 * Applies checked text-resource changes through one storage driver.
 */
export async function applyStorageChangeSet(
  storage: LibrarianStorage,
  changes: StorageChangeSetTextChange[],
): Promise<StorageChangeSetApplyResult[]> {
  const preview = await previewStorageChangeSetApply(storage, changes);
  if (!preview.clean) {
    throw new Error("Proposed changes conflict with current storage state.");
  }
  const applied = [];
  for (const change of changes) {
    await storage.makeDirectory(dirname(change.path));
    await storage.writeText(change.path, change.content);
    applied.push({
      path: change.path,
      sha256: sha256Text(change.content),
      bytesWritten: Buffer.byteLength(change.content, "utf8"),
    });
  }
  return applied;
}

/**
 * Persists a durable change-set record in filesystem-backed storage.
 */
export async function persistStorageChangeSet(
  storage: LibrarianStorage,
  storePath: string,
  record: StoragePersistedChangeSet,
): Promise<void> {
  await storage.makeDirectory(storePath);
  await storage.writeText(
    persistedChangeSetPath(storePath, record.id),
    `${JSON.stringify(record, null, 2)}\n`,
  );
}

/**
 * Lists durable change-set records from filesystem-backed storage.
 */
export async function listStorageChangeSets(
  storage: LibrarianStorage,
  storePath: string,
  input: StorageChangeSetListInput = {},
): Promise<StoragePersistedChangeSet[]> {
  if (!(await storage.exists(storePath))) {
    return [];
  }
  const records = [];
  for (const entry of await storage.listDirectory(storePath)) {
    if (entry.isDirectory || !entry.name.endsWith(".json")) {
      continue;
    }
    const record = parsePersistedChangeSet(
      await storage.readText(join(storePath, entry.name)),
    );
    if (persistedChangeSetMatches(record, input)) {
      records.push(record);
    }
  }
  return records.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

/**
 * Reads one durable change-set record from filesystem-backed storage.
 */
export async function readStorageChangeSet(
  storage: LibrarianStorage,
  storePath: string,
  changeSetId: string,
): Promise<StoragePersistedChangeSet | null> {
  const path = persistedChangeSetPath(storePath, changeSetId);
  if (!(await storage.exists(path))) {
    return null;
  }
  return parsePersistedChangeSet(await storage.readText(path));
}

/**
 * Computes a stable SHA-256 digest for text content.
 */
export function sha256Text(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

function persistedChangeSetPath(storePath: string, changeSetId: string): string {
  return join(storePath, `${safeChangeSetId(changeSetId)}.json`);
}

function safeChangeSetId(changeSetId: string): string {
  return changeSetId.replace(/[^A-Za-z0-9._-]/g, "_") || "change-set";
}

function parsePersistedChangeSet(text: string): StoragePersistedChangeSet {
  const value = JSON.parse(text) as unknown;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Persisted change set is malformed.");
  }
  return value as StoragePersistedChangeSet;
}

function persistedChangeSetMatches(
  record: StoragePersistedChangeSet,
  input: StorageChangeSetListInput,
): boolean {
  if (input.status && record.status !== input.status) {
    return false;
  }
  if (input.actorUri && record.actorUri !== input.actorUri) {
    return false;
  }
  if (input.contextActorUris?.length) {
    return input.contextActorUris.every((actorUri) =>
      record.contextFilters.actorUris.includes(actorUri)
    );
  }
  return true;
}
