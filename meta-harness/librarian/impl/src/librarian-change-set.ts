// Generated file. Do not edit directly; update the Spec first.
// Harness-Requirement: librarian.change-set-operations
// Harness-Requirement: librarian.driver-change-set-application
// Harness-Requirement: change-sets.git-diff-change-set-format
// Harness-Requirement: change-sets.produce-apply-reconcile
// Harness-Requirement: change-sets.baseline-conflict-detection
// Harness-Requirement: change-sets.librarian-driver-change-set-contract
// Harness-Requirement: change-sets.persistent-change-sets

import { createHash } from "node:crypto";
import { join } from "node:path";
import { isLibraryPathExcluded } from "./is-library-path-excluded.js";
import { libraryResourceUri } from "./library-resource-uri.js";
import { parseToml } from "./parse-toml.js";
import { resolveLibraryFilePath } from "./resolve-library-file-path.js";
import { resolveLibraryResource } from "./resolve-library-resource.js";
import { runRepositoryStaticChecks } from "./repository-static-checks.js";
import { sha256Text } from "./storage-change-set-hooks.js";
import type {
  LibrarianContext,
  LibrarianStorage,
  ResolvedLibrary,
  StoragePersistedChangeSet,
  StoragePersistedChangeSetCheck,
  StoragePersistedChangeSetStatus,
} from "./types.js";

export type LibrarianChangeSet = {
  kind: "librarian.change-set";
  format: "git-unified-diff";
  id: string;
  actorUri: string;
  actorUris: string[];
  contextFilters: {
    actorUris: string[];
  };
  changes: LibrarianChangeSetChange[];
  complianceReviews: LibrarianComplianceReview[];
};

export type LibrarianComplianceReview = {
  complianceUri: string;
  status: "pass";
  reviewerActorUri: string;
  reviewedAt: string;
  notes?: string;
};

export type LibrarianChangeSetChange = {
  operation: "update";
  uri: string;
  libraryUri: string;
  baseline: {
    sha256: string;
    bytes: number;
  };
  proposed: {
    sha256: string;
    bytes: number;
    content: string;
  };
  diff: string;
};

export type ChangeSetCheck = {
  id: string;
  status: "pass" | "fail";
  message: string;
  uri?: string;
};

export type ChangeSetConflict = {
  uri: string;
  baselineSha256: string;
  currentSha256: string;
};

type ResolvedChange = {
  library: ResolvedLibrary;
  absolutePath: string;
  relativePath: string;
  change: LibrarianChangeSetChange;
};

/**
 * Produces a governed change set from proposed text resource edits.
 */
export async function produceChangeSet(
  context: LibrarianContext,
  input: { changes: unknown },
): Promise<Record<string, unknown>> {
  const resolved = await Promise.all(parseProduceChanges(input.changes).map(async (inputChange) => {
    const { library, path } = await resolveLibraryResource(context, inputChange.uri);
    verifyEditableResource(context, library, path, inputChange.uri);
    const absolutePath = resolveLibraryFilePath(library.rootPath, path);
    const baseline = await readDriverBaseline(library.storage, absolutePath);
    if (
      inputChange.baselineContent !== undefined &&
      sha256Text(inputChange.baselineContent) !== baseline.sha256
    ) {
      throw new Error(`${inputChange.uri} changed before the edit was staged.`);
    }
    const proposedSha256 = sha256Text(inputChange.content);
    const change = {
      operation: "update" as const,
      uri: libraryResourceUri(library.uri, path),
      libraryUri: library.uri,
      baseline: {
        sha256: baseline.sha256,
        bytes: baseline.bytes,
      },
      proposed: {
        sha256: proposedSha256,
        bytes: Buffer.byteLength(inputChange.content, "utf8"),
        content: inputChange.content,
      },
      diff: renderUnifiedDiff(path, baseline.content, inputChange.content),
    };
    return {
      library,
      absolutePath,
      relativePath: path,
      change,
    };
  }));
  const changes = resolved.map((entry) => entry.change);
  const changeSet: LibrarianChangeSet = {
    kind: "librarian.change-set",
    format: "git-unified-diff",
    id: changeSetId(changes),
    actorUri: context.actorUri,
    actorUris: context.actorUris,
    contextFilters: {
      actorUris: context.contextFilters.actorUris,
    },
    changes,
    complianceReviews: [],
  };
  const checks = runStaticChecks(changeSet);
  await persistResolvedChangeSet(resolved, changeSet, checks, "proposed");
  return {
    changeSet,
    checks,
  };
}

/**
 * Validates a governed change set without mutating storage.
 */
export async function validateChangeSet(
  context: LibrarianContext,
  input: { changeSet: unknown },
): Promise<Record<string, unknown>> {
  const changeSet = parseChangeSet(input.changeSet);
  const resolved = await resolveChangeSet(context, changeSet);
  const checks = [
    ...runStaticChecks(changeSet),
    ...(await runResolvedChecks(resolved)),
    ...(await runProposedRepositoryStaticChecks(resolved)),
    ...(await runComplianceReviewChecks(resolved, changeSet.complianceReviews)),
  ];
  const conflicts = await previewResolvedChanges(resolved);
  await persistResolvedChangeSet(resolved, changeSet, checks, "proposed");
  return {
    changeSetId: changeSet.id,
    clean: conflicts.length === 0 && checks.every((check) => check.status === "pass"),
    checks,
    conflicts,
  };
}

/**
 * Applies a validated governed change set through storage driver hooks.
 */
export async function applyChangeSet(
  context: LibrarianContext,
  input: { changeSet: unknown },
): Promise<Record<string, unknown>> {
  const changeSet = parseChangeSet(input.changeSet);
  const resolved = await resolveChangeSet(context, changeSet);
  const checks = [
    ...runStaticChecks(changeSet),
    ...(await runResolvedChecks(resolved)),
    ...(await runProposedRepositoryStaticChecks(resolved)),
    ...(await runComplianceReviewChecks(resolved, changeSet.complianceReviews)),
  ];
  const conflicts = await previewResolvedChanges(resolved);
  if (conflicts.length > 0 || checks.some((check) => check.status === "fail")) {
    await persistResolvedChangeSet(resolved, changeSet, checks, "proposed");
    return {
      changeSetId: changeSet.id,
      applied: false,
      checks,
      conflicts,
    };
  }

  const applied = [];
  for (const group of groupResolvedChangesByStorage(resolved)) {
    if (!group.storage.applyChangeSet) {
      throw new Error("Storage driver does not expose change set application hooks.");
    }
    const groupApplied = await group.storage.applyChangeSet(
      group.changes.map((change) => ({
        path: change.absolutePath,
        baselineSha256: change.change.baseline.sha256,
        content: change.change.proposed.content,
      })),
    );
    for (const output of groupApplied) {
      const resolvedChange = group.changes.find((change) => change.absolutePath === output.path);
      applied.push({
        uri: resolvedChange?.change.uri ?? output.path,
        bytesWritten: output.bytesWritten,
        sha256: output.sha256,
      });
    }
  }
  await persistResolvedChangeSet(resolved, changeSet, checks, "applied");

  return {
    changeSetId: changeSet.id,
    applied: true,
    checks,
    appliedChanges: applied,
  };
}

/**
 * Abandons a durable governed change set without mutating target resources.
 */
export async function abandonChangeSet(
  context: LibrarianContext,
  input: { changeSet: unknown },
): Promise<Record<string, unknown>> {
  const changeSet = parseChangeSet(input.changeSet);
  const resolved = await resolveChangeSet(context, changeSet);
  await persistResolvedChangeSet(
    resolved,
    changeSet,
    runStaticChecks(changeSet),
    "abandoned",
  );
  return {
    changeSetId: changeSet.id,
    abandoned: true,
  };
}

/**
 * Lists persisted change sets visible to the active actor context.
 */
export async function listChangeSets(
  context: LibrarianContext,
  input: { status?: unknown } = {},
): Promise<Record<string, unknown>> {
  const status = input.status === "applied" ? "applied" : "proposed";
  const records: StoragePersistedChangeSet[] = [];
  for (const location of context.storageLocations) {
    if (!location.storage.listChangeSets) {
      throw new Error("Storage driver does not expose change set persistence hooks.");
    }
    records.push(...await location.storage.listChangeSets(
      changeSetStorePath(location.libraryRootPath),
      {
        status,
        actorUri: context.actorUri,
        contextActorUris: context.contextFilters.actorUris,
      },
    ));
  }
  return {
    changeSets: records
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((record) => ({
        id: record.id,
        status: record.status,
        checks: record.checks,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        changeSet: changeSetFromPersistedRecord(record),
      })),
  };
}

async function persistResolvedChangeSet(
  resolved: ResolvedChange[],
  changeSet: LibrarianChangeSet,
  checks: ChangeSetCheck[],
  status: StoragePersistedChangeSetStatus,
): Promise<void> {
  const target = resolved[0];
  if (!target) {
    return;
  }
  if (!target.library.storage.persistChangeSet) {
    throw new Error("Storage driver does not expose change set persistence hooks.");
  }
  const storePath = changeSetStorePath(target.library.storageLocationRootPath);
  const existing = await target.library.storage.readChangeSet?.(storePath, changeSet.id);
  const now = new Date().toISOString();
  if (status === "proposed") {
    await supersedeExistingProposedChangeSets(
      target.library.storage,
      storePath,
      changeSet,
      now,
    );
  }
  await target.library.storage.persistChangeSet(
    storePath,
    persistedRecordFromChangeSet(
      changeSet,
      checks,
      status,
      existing?.createdAt ?? now,
      now,
      resolved,
    ),
  );
}

async function supersedeExistingProposedChangeSets(
  storage: LibrarianStorage,
  storePath: string,
  changeSet: LibrarianChangeSet,
  updatedAt: string,
): Promise<void> {
  if (!storage.listChangeSets || !storage.persistChangeSet) {
    throw new Error("Storage driver does not expose change set persistence hooks.");
  }
  const proposedRecords = await storage.listChangeSets(storePath, {
    status: "proposed",
    actorUri: changeSet.actorUri,
    contextActorUris: changeSet.contextFilters.actorUris,
  });
  for (const record of proposedRecords) {
    if (
      record.id === changeSet.id ||
      !sameActorSet(record.contextFilters.actorUris, changeSet.contextFilters.actorUris)
    ) {
      continue;
    }
    await storage.persistChangeSet(storePath, {
      ...record,
      status: "superseded",
      updatedAt,
    });
  }
}

function persistedRecordFromChangeSet(
  changeSet: LibrarianChangeSet,
  checks: ChangeSetCheck[],
  status: StoragePersistedChangeSetStatus,
  createdAt: string,
  updatedAt: string,
  resolved: ResolvedChange[],
): StoragePersistedChangeSet {
  return {
    id: changeSet.id,
    format: changeSet.format,
    actorUri: changeSet.actorUri,
    actorUris: changeSet.actorUris,
    contextFilters: changeSet.contextFilters,
    status,
    checks: checks.map((check): StoragePersistedChangeSetCheck => ({
      id: check.id,
      status: check.status,
      message: check.message,
      uri: check.uri,
    })),
    changes: resolved.map((entry) => ({
      uri: entry.change.uri,
      libraryUri: entry.change.libraryUri,
      resourcePath: entry.relativePath,
      baselineSha256: entry.change.baseline.sha256,
      baselineBytes: entry.change.baseline.bytes,
      proposedSha256: entry.change.proposed.sha256,
      proposedBytes: entry.change.proposed.bytes,
      proposedContent: entry.change.proposed.content,
      diff: entry.change.diff,
    })),
    createdAt,
    updatedAt,
  };
}

function sameActorSet(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.every((value, index) => value === sortedRight[index]);
}

function changeSetFromPersistedRecord(record: StoragePersistedChangeSet): LibrarianChangeSet {
  return {
    kind: "librarian.change-set",
    format: record.format,
    id: record.id,
    actorUri: record.actorUri,
    actorUris: record.actorUris,
    contextFilters: record.contextFilters,
    changes: record.changes.map((change) => ({
      operation: "update" as const,
      uri: change.uri,
      libraryUri: change.libraryUri,
      baseline: {
        sha256: change.baselineSha256,
        bytes: change.baselineBytes,
      },
      proposed: {
        sha256: change.proposedSha256,
        bytes: change.proposedBytes,
        content: change.proposedContent,
      },
      diff: change.diff,
    })),
    complianceReviews: [],
  };
}

function changeSetStorePath(storageLocationRootPath: string): string {
  return join(storageLocationRootPath, ".meta-harness", "change-sets");
}

function parseProduceChanges(value: unknown): Array<{
  uri: string;
  baselineContent?: string;
  content: string;
}> {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("At least one change is required.");
  }
  return value.map((item) => {
    const record = requiredRecord(item, "Each change must be an object.");
    if (typeof record.uri !== "string" || typeof record.content !== "string") {
      throw new Error("Each change must include uri and content.");
    }
    if (
      record.baselineContent !== undefined &&
      typeof record.baselineContent !== "string"
    ) {
      throw new Error("Change baselineContent must be a string when provided.");
    }
    return {
      uri: record.uri,
      baselineContent: typeof record.baselineContent === "string"
        ? record.baselineContent
        : undefined,
      content: record.content,
    };
  });
}

function parseChangeSet(value: unknown): LibrarianChangeSet {
  const record = requiredRecord(value, "changeSet must be an object.");
  if (
    record.kind !== "librarian.change-set" ||
    record.format !== "git-unified-diff" ||
    typeof record.id !== "string" ||
    typeof record.actorUri !== "string" ||
    !Array.isArray(record.actorUris) ||
    record.actorUris.some((actorUri) => typeof actorUri !== "string") ||
    !Array.isArray(record.changes)
  ) {
    throw new Error("changeSet is malformed.");
  }
  const contextFilters = requiredRecord(record.contextFilters, "changeSet contextFilters must be an object.");
  const actorUriFilters = contextFilters.actorUris;
  if (!Array.isArray(actorUriFilters) || actorUriFilters.some((actorUri) => typeof actorUri !== "string")) {
    throw new Error("changeSet contextFilters.actorUris must be a string array.");
  }
  const changes = record.changes.map((item) => {
    const change = requiredRecord(item, "changeSet changes must be objects.");
    const baseline = requiredRecord(change.baseline, "changeSet baseline must be an object.");
    const proposed = requiredRecord(change.proposed, "changeSet proposed must be an object.");
    if (
      change.operation !== "update" ||
      typeof change.uri !== "string" ||
      typeof change.libraryUri !== "string" ||
      typeof change.diff !== "string" ||
      typeof baseline.sha256 !== "string" ||
      typeof baseline.bytes !== "number" ||
      typeof proposed.sha256 !== "string" ||
      typeof proposed.bytes !== "number" ||
      typeof proposed.content !== "string"
    ) {
      throw new Error("changeSet change is malformed.");
    }
    return {
      operation: "update" as const,
      uri: change.uri,
      libraryUri: change.libraryUri,
      baseline: {
        sha256: baseline.sha256,
        bytes: baseline.bytes,
      },
      proposed: {
        sha256: proposed.sha256,
        bytes: proposed.bytes,
        content: proposed.content,
      },
      diff: change.diff,
    };
  });
  const complianceReviews = parseComplianceReviews(record.complianceReviews);
  return {
    kind: "librarian.change-set",
    format: "git-unified-diff",
    id: record.id,
    actorUri: record.actorUri,
    actorUris: record.actorUris,
    contextFilters: {
      actorUris: actorUriFilters,
    },
    changes,
    complianceReviews,
  };
}

function parseComplianceReviews(value: unknown): LibrarianComplianceReview[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new Error("changeSet complianceReviews must be an array.");
  }
  return value.map((item) => {
    const review = requiredRecord(item, "changeSet complianceReviews must contain objects.");
    if (
      typeof review.complianceUri !== "string" ||
      review.status !== "pass" ||
      typeof review.reviewerActorUri !== "string" ||
      typeof review.reviewedAt !== "string" ||
      (review.notes !== undefined && typeof review.notes !== "string")
    ) {
      throw new Error("changeSet compliance review is malformed.");
    }
    return {
      complianceUri: review.complianceUri,
      status: "pass" as const,
      reviewerActorUri: review.reviewerActorUri,
      reviewedAt: review.reviewedAt,
      notes: typeof review.notes === "string" ? review.notes : undefined,
    };
  });
}

async function resolveChangeSet(
  context: LibrarianContext,
  changeSet: LibrarianChangeSet,
): Promise<ResolvedChange[]> {
  return Promise.all(changeSet.changes.map(async (change) => {
    const { library, path } = await resolveLibraryResource(context, change.uri);
    verifyEditableResource(context, library, path, change.uri);
    if (library.uri !== change.libraryUri) {
      throw new Error(`${change.uri} does not match change set resource identity.`);
    }
    if (sha256Text(change.proposed.content) !== change.proposed.sha256) {
      throw new Error(`${change.uri} proposed content digest does not match the change set.`);
    }
    return {
      library,
      absolutePath: resolveLibraryFilePath(library.rootPath, path),
      relativePath: path,
      change,
    };
  }));
}

function verifyEditableResource(
  context: LibrarianContext,
  library: ResolvedLibrary,
  path: string,
  uri: string,
): void {
  if (!library.readable) {
    throw new Error(`${uri} is not readable by ${context.actorUri}`);
  }
  if (!library.writable) {
    throw new Error(`${uri} is not writable by ${context.actorUri}`);
  }
  if (isLibraryPathExcluded(path, library.agentExcludes)) {
    throw new Error(`${path} is excluded from agent access`);
  }
}

async function readDriverBaseline(
  storage: LibrarianStorage,
  path: string,
): Promise<{ content: string; sha256: string; bytes: number }> {
  if (!storage.readChangeSetBaseline) {
    throw new Error("Storage driver does not expose change set baseline hooks.");
  }
  return storage.readChangeSetBaseline(path);
}

async function previewResolvedChanges(
  resolved: ResolvedChange[],
): Promise<ChangeSetConflict[]> {
  const conflicts: ChangeSetConflict[] = [];
  for (const group of groupResolvedChangesByStorage(resolved)) {
    if (!group.storage.previewChangeSetApply) {
      throw new Error("Storage driver does not expose change set preview hooks.");
    }
    const preview = await group.storage.previewChangeSetApply(
      group.changes.map((change) => ({
        path: change.absolutePath,
        baselineSha256: change.change.baseline.sha256,
        content: change.change.proposed.content,
      })),
    );
    for (const conflict of preview.conflicts) {
      const resolvedChange = group.changes.find((change) => change.absolutePath === conflict.path);
      conflicts.push({
        uri: resolvedChange?.change.uri ?? conflict.path,
        baselineSha256: conflict.baselineSha256,
        currentSha256: conflict.currentSha256,
      });
    }
  }
  return conflicts;
}

function groupResolvedChangesByStorage(
  changes: ResolvedChange[],
): Array<{ storage: LibrarianStorage; changes: ResolvedChange[] }> {
  const groups: Array<{ storage: LibrarianStorage; changes: ResolvedChange[] }> = [];
  for (const change of changes) {
    let group = groups.find((candidate) => candidate.storage === change.library.storage);
    if (!group) {
      group = { storage: change.library.storage, changes: [] };
      groups.push(group);
    }
    group.changes.push(change);
  }
  return groups;
}

function runStaticChecks(changeSet: LibrarianChangeSet): ChangeSetCheck[] {
  const checks: ChangeSetCheck[] = [{
    id: "librarian.change-set-shape",
    status: "pass",
    message: "Change set shape is valid.",
  }];
  if (changeSet.id !== changeSetId(changeSet.changes)) {
    checks.push({
      id: "librarian.change-set-id",
      status: "fail",
      message: "Change set ID does not match its changes.",
    });
  } else {
    checks.push({
      id: "librarian.change-set-id",
      status: "pass",
      message: "Change set ID matches its changes.",
    });
  }
  for (const change of changeSet.changes) {
    if (change.uri.endsWith(".toml")) {
      try {
        parseToml(change.proposed.content);
        checks.push({
          id: "librarian.toml-format",
          status: "pass",
          message: "TOML parses successfully.",
          uri: change.uri,
        });
      } catch (error) {
        checks.push({
          id: "librarian.toml-format",
          status: "fail",
          message: error instanceof Error ? error.message : "TOML parsing failed.",
          uri: change.uri,
        });
      }
    }
  }
  return checks;
}

async function runResolvedChecks(
  resolved: ResolvedChange[],
): Promise<ChangeSetCheck[]> {
  const checks: ChangeSetCheck[] = [];
  for (const change of resolved) {
    const current = await readDriverBaseline(change.library.storage, change.absolutePath);
    if (current.sha256 !== change.change.baseline.sha256) {
      checks.push({
        id: "change-sets.baseline-conflict-detection",
        status: "fail",
        message: "Current resource baseline differs from the change set baseline.",
        uri: change.change.uri,
      });
      continue;
    }
    const expectedDiff = renderUnifiedDiff(
      change.relativePath,
      current.content,
      change.change.proposed.content,
    );
    if (change.change.diff !== expectedDiff) {
      checks.push({
        id: "change-sets.git-diff-format",
        status: "fail",
        message: "Change set diff does not match the baseline and proposed content.",
        uri: change.change.uri,
      });
    } else {
      checks.push({
        id: "change-sets.git-diff-format",
        status: "pass",
        message: "Change set diff matches the baseline and proposed content.",
        uri: change.change.uri,
      });
    }
  }
  return checks;
}

async function runComplianceReviewChecks(
  resolved: ResolvedChange[],
  reviews: LibrarianComplianceReview[],
): Promise<ChangeSetCheck[]> {
  const checks: ChangeSetCheck[] = [];
  for (const change of resolved) {
    const applicableCompliance = await findApplicableCompliance(change);
    if (applicableCompliance.length === 0) {
      checks.push({
        id: "librarian.applicable-compliance-review",
        status: "pass",
        message: "No applicable compliance files were found for this resource.",
        uri: change.change.uri,
      });
      continue;
    }
    for (const complianceUri of applicableCompliance) {
      const review = reviews.find((candidate) => candidate.complianceUri === complianceUri);
      checks.push({
        id: "librarian.applicable-compliance-review",
        status: review ? "pass" : "fail",
        message: review
          ? `Applicable compliance reviewed by ${review.reviewerActorUri}.`
          : "Applicable compliance review is required before apply.",
        uri: change.change.uri,
      });
    }
  }
  return checks;
}

async function runProposedRepositoryStaticChecks(
  resolved: ResolvedChange[],
): Promise<ChangeSetCheck[]> {
  return runRepositoryStaticChecks(resolved.map((change) => ({
    uri: change.change.uri,
    libraryUri: change.change.libraryUri,
    relativePath: change.relativePath,
    content: change.change.proposed.content,
  })));
}

async function findApplicableCompliance(change: ResolvedChange): Promise<string[]> {
  const complianceUris: string[] = [];
  for (const compliancePath of complianceCandidateRelativePaths(change.relativePath)) {
    const absolutePath = resolveLibraryFilePath(change.library.rootPath, compliancePath);
    if (await change.library.storage.exists(absolutePath)) {
      complianceUris.push(libraryResourceUri(change.library.uri, compliancePath));
    }
  }
  return complianceUris;
}

function complianceCandidateRelativePaths(relativePath: string): string[] {
  const segments = relativePath.split("/").filter(Boolean);
  const directories = segments.slice(0, -1);
  const candidates = ["COMPLIANCE.toml"];
  for (let index = 0; index < directories.length; index += 1) {
    candidates.push(`${directories.slice(0, index + 1).join("/")}/COMPLIANCE.toml`);
  }
  if (segments[segments.length - 1] === "COMPLIANCE.toml") {
    candidates.push(segments.join("/"));
  }
  return [...new Set(candidates)];
}

function renderUnifiedDiff(path: string, before: string, after: string): string {
  const beforeLines = splitDiffLines(before);
  const afterLines = splitDiffLines(after);
  const oldCount = Math.max(beforeLines.length, 1);
  const newCount = Math.max(afterLines.length, 1);
  return [
    `diff --git a/${path} b/${path}`,
    `--- a/${path}`,
    `+++ b/${path}`,
    `@@ -1,${oldCount} +1,${newCount} @@`,
    ...beforeLines.map((line) => `-${line}`),
    ...afterLines.map((line) => `+${line}`),
    "",
  ].join("\n");
}

function splitDiffLines(content: string): string[] {
  if (!content) {
    return [];
  }
  const withoutTrailingNewline = content.endsWith("\n") ? content.slice(0, -1) : content;
  return withoutTrailingNewline.split("\n");
}

function changeSetId(changes: LibrarianChangeSetChange[]): string {
  return `change-set-${createHash("sha256")
    .update(JSON.stringify(changes), "utf8")
    .digest("hex")
    .slice(0, 24)}`;
}

function requiredRecord(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(message);
  }
  return value as Record<string, unknown>;
}
