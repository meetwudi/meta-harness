// Harness-Requirement: librarian.change-set-operations

import { execFile as execFileCallback } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

type RepositoryStaticCheck = {
  id: string;
  status: "pass" | "fail";
  message: string;
  uri?: string;
};

type RepositoryStaticCheckChange = {
  uri: string;
  libraryUri: string;
  relativePath: string;
  content: string;
};

type StaticCheckSpec = {
  id: string;
  scriptName: string;
  passMessage: string;
  matches(path: string): boolean;
};

const staticCheckSpecs: StaticCheckSpec[] = [
  {
    id: "harness.static-checks.library-definitions",
    scriptName: "check-library-definitions",
    passMessage: "Library definitions passed repository checks.",
    matches: (path) => basename(path) === "LIBRARY.toml",
  },
  {
    id: "harness.static-checks.memory-definitions",
    scriptName: "check-memory-definitions",
    passMessage: "Memory definitions passed repository checks.",
    matches: (path) => basename(path) === "MEMORY.toml",
  },
  {
    id: "harness.static-checks.compliance-definitions",
    scriptName: "check-compliance-definitions",
    passMessage: "Compliance definitions passed repository checks.",
    matches: (path) => basename(path) === "COMPLIANCE.toml",
  },
];

/**
 * Runs the same repository static definition check scripts used by git hooks
 * against proposed Library resource content before storage mutation.
 */
export async function runRepositoryStaticChecks(
  changes: RepositoryStaticCheckChange[],
): Promise<RepositoryStaticCheck[]> {
  const checks: RepositoryStaticCheck[] = [];
  for (const spec of staticCheckSpecs) {
    const relevantChanges = changes.filter((change) => spec.matches(change.relativePath));
    if (relevantChanges.length === 0) {
      continue;
    }
    checks.push(...await runStaticCheckSpec(spec, relevantChanges));
  }
  return checks;
}

async function runStaticCheckSpec(
  spec: StaticCheckSpec,
  changes: RepositoryStaticCheckChange[],
): Promise<RepositoryStaticCheck[]> {
  const repoRoot = repositoryRootPath();
  const scriptPath = resolve(repoRoot, "meta-harness", "tools", spec.scriptName);
  const tempRoot = await mkdtemp(resolve(tmpdir(), "meta-harness-proposed-check-"));
  try {
    await writeProposedWorkspace(tempRoot, changes);
    try {
      await execFile("python3", [scriptPath, "--repo-root", tempRoot], {
        cwd: repoRoot,
        maxBuffer: 1024 * 1024,
      });
      return [{
        id: spec.id,
        status: "pass",
        message: spec.passMessage,
        uri: singleUri(changes),
      }];
    } catch (error) {
      return staticCheckFailureChecks(spec, changes, error, tempRoot);
    }
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

async function writeProposedWorkspace(
  tempRoot: string,
  changes: RepositoryStaticCheckChange[],
): Promise<void> {
  for (const change of changes) {
    const workspacePath = proposedWorkspacePath(tempRoot, change);
    await mkdir(dirname(workspacePath), { recursive: true });
    await writeFile(workspacePath, change.content, "utf8");
  }
}

function proposedWorkspacePath(
  tempRoot: string,
  change: RepositoryStaticCheckChange,
): string {
  const librarySegment = safePathSegment(change.libraryUri.replace(/^library:\/\//, ""));
  const pathSegments = change.relativePath
    .split("/")
    .filter((segment) => segment && segment !== "." && segment !== "..")
    .map(safePathSegment);
  const workspacePath = resolve(tempRoot, librarySegment, ...pathSegments);
  if (!workspacePath.startsWith(`${tempRoot}${sep}`)) {
    throw new Error(`${change.uri} could not be mapped into the static check workspace.`);
  }
  return workspacePath;
}

function staticCheckFailureChecks(
  spec: StaticCheckSpec,
  changes: RepositoryStaticCheckChange[],
  error: unknown,
  tempRoot: string,
): RepositoryStaticCheck[] {
  const execError = error as Error & {
    code?: number | string;
    stderr?: string;
    stdout?: string;
  };
  const output = `${execError.stderr ?? ""}\n${execError.stdout ?? ""}`.trim();
  const failureLines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => sanitizeStaticCheckMessage(line.slice(2), tempRoot));
  if (execError.code === 1 && failureLines.length > 0) {
    return failureLines.map((message) => ({
      id: spec.id,
      status: "fail" as const,
      message,
      uri: singleUri(changes),
    }));
  }
  return [{
    id: spec.id,
    status: "fail",
    message: sanitizeStaticCheckMessage(
      output || execError.message || `${spec.scriptName} could not run.`,
      tempRoot,
    ),
    uri: singleUri(changes),
  }];
}

function sanitizeStaticCheckMessage(message: string, tempRoot: string): string {
  return message
    .replaceAll(tempRoot, "proposed changes")
    .replace(/\s+/g, " ")
    .trim();
}

function repositoryRootPath(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
}

function basename(path: string): string {
  return path.split("/").filter(Boolean).pop() ?? "";
}

function safePathSegment(segment: string): string {
  return segment.replace(/[^A-Za-z0-9._-]/g, "_") || "resource";
}

function singleUri(changes: RepositoryStaticCheckChange[]): string | undefined {
  return changes.length === 1 ? changes[0]?.uri : undefined;
}
