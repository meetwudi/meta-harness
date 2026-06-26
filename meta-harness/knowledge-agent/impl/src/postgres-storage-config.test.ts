// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.local-filesystem-storage-compatibility: verifies filesystem storage remains available without Postgres env.
// Supports knowledge-agent.project-config-selection: verifies project config selection scopes storage discovery.
// Supports storage.env-gated-storage-locations: verifies optional Postgres locations are gated by deployment env.
// Supports storage.project-scoped-storage-locations: verifies selected project config locations do not inherit root machine-local locations.
// Supports storage.postgres-deployment-configuration: verifies env-provided Postgres connection configuration.
// Supports proj-quartz.postgres-backed-libraries: verifies configured Postgres-backed Libraries through Librarian.
// Harness-Requirement: knowledge-agent.project-config-selection
// Harness-Requirement: storage.project-scoped-storage-locations

import assert from "node:assert/strict";
import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from "node:child_process";
import { once } from "node:events";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createLibrarianContext,
  createLocalFileSystemStorage,
  executeLibrarianTool,
  type PostgresStorage,
} from "../../../librarian/impl/dist/index.js";
import { loadLocalStorageLocations } from "./load-local-storage-locations.js";
import type { PreparedRuntime } from "./types.js";

const postgresCommand = requireCommand("postgres");
const initdbCommand = requireCommand("initdb");
const originalQuartzPostgresUrl = process.env.QUARTZ_POSTGRES_URL;
const workRoot = await mkdtemp(join(tmpdir(), "ka-pg-"));
const repoRoot = join(workRoot, "repo");
const projectRoot = join(repoRoot, "proj-quartz");
const localRoot = join(workRoot, "local");
const dataRoot = join(workRoot, "data");
const socketRoot = join(workRoot, "socket");
const port = await availablePort();
const connectionString = `postgresql://postgres@127.0.0.1:${port}/postgres`;
let postgres: ChildProcessWithoutNullStreams | undefined;
let postgresStorage: PostgresStorage | undefined;

try {
  await mkdir(repoRoot, { recursive: true });
  await mkdir(projectRoot, { recursive: true });
  await mkdir(localRoot, { recursive: true });
  await writeFile(
    join(repoRoot, ".meta-harness.json"),
    JSON.stringify(
      {
        schema: 1,
        project: {
          name: "config-test",
          localRoot,
        },
        storage: {
          locations: [
            {
              name: "machine-local",
              description: "Root machine-local storage that project config must not inherit.",
              driverName: "filesystem",
              grants: [
                {
                  actors: ["actor://knowledge-agent"],
                  capabilities: ["read", "write", "delete", "query", "blob"],
                },
              ],
              libraryRootPath: "{{localRoot}}",
              discoveryMode: "filesystem-recursive",
              discoveryExcludes: [],
              discoverLibraries: true,
            },
          ],
        },
      },
      null,
      2,
    ),
  );
  await writeFile(
    join(projectRoot, ".meta-harness.json"),
    JSON.stringify(
      {
        schema: 1,
        project: {
          name: "proj-quartz",
          localRoot,
        },
        storage: {
          locations: [
            {
              name: "project",
              description: "Project filesystem fixture storage.",
              driverName: "filesystem",
              grants: [
                {
                  actors: ["actor://knowledge-agent"],
                  capabilities: ["read", "write", "delete", "query", "blob"],
                },
              ],
              libraryRootPath: "{{projectRootPath}}",
              discoveryMode: "filesystem-root-and-direct-children",
              discoveryExcludes: [],
              discoverLibraries: true,
            },
            {
              name: "tmp-local",
              description: "Project-scoped temporary filesystem fixture storage.",
              driverName: "filesystem",
              grants: [
                {
                  actors: ["actor://knowledge-agent"],
                  capabilities: ["read", "write", "delete", "query", "blob"],
                },
              ],
              libraryRootPath: "{{tmpStorageLibrariesRoot}}",
              discoveryMode: "filesystem-root-and-direct-children",
              discoveryExcludes: [],
              discoverLibraries: true,
            },
            {
              name: "quartz-postgres",
              description: "Postgres fixture storage.",
              driverName: "postgres",
              enabledWhenEnv: "QUARTZ_POSTGRES_URL",
              connectionStringEnv: "QUARTZ_POSTGRES_URL",
              schemaName: "meta_harness",
              tableName: "resources",
              grants: [
                {
                  actors: ["actor://knowledge-agent"],
                  capabilities: ["read", "write", "delete", "query"],
                },
              ],
              libraryRootPath: "/libraries",
              discoveryMode: "resource-root-and-direct-children",
              discoveryExcludes: [],
              discoverLibraries: true,
            },
          ],
        },
      },
      null,
      2,
    ),
  );

  const runtime = preparedRuntime(workRoot, localRoot);
  const filesystemStorage = createLocalFileSystemStorage();
  delete process.env.QUARTZ_POSTGRES_URL;
  const withoutPostgres = loadLocalStorageLocations({
    repoRootPath: repoRoot,
    projectConfigPath: "proj-quartz/.meta-harness.json",
    runtime,
    storage: filesystemStorage,
    actorUris: ["actor://knowledge-agent"],
  });
  assert.deepEqual(
    withoutPostgres.map((location) => location.name),
    ["project", "tmp-local"],
  );

  runCommand(initdbCommand, [
    "-D",
    dataRoot,
    "-A",
    "trust",
    "-U",
    "postgres",
    "--encoding=UTF8",
    "--no-locale",
  ]);
  await mkdir(socketRoot, { recursive: true });
  postgres = spawn(postgresCommand, [
    "-D",
    dataRoot,
    "-k",
    socketRoot,
    "-p",
    String(port),
  ]);
  const stderr: string[] = [];
  postgres.stderr.setEncoding("utf8");
  postgres.stderr.on("data", (chunk) => stderr.push(chunk));
  process.env.QUARTZ_POSTGRES_URL = connectionString;

  const withPostgres = loadLocalStorageLocations({
    repoRootPath: repoRoot,
    projectConfigPath: "proj-quartz/.meta-harness.json",
    runtime,
    storage: filesystemStorage,
    actorUris: ["actor://knowledge-agent"],
  });
  assert.deepEqual(
    withPostgres.map((location) => location.name),
    ["project", "tmp-local", "quartz-postgres"],
  );

  postgresStorage = withPostgres.find((location) => location.name === "quartz-postgres")
    ?.storage as PostgresStorage | undefined;
  assert.ok(postgresStorage);
  await waitForPostgres(postgresStorage, () => stderr.join(""));

  const context = createLibrarianContext({
    storage: filesystemStorage,
    storageLocations: withPostgres,
    actorUri: "actor://knowledge-agent",
    sessionId: "postgres-storage-config",
  });
  await executeLibrarianTool(context, "librarian_create_library", {
    storageLocationName: "quartz-postgres",
    name: "quartz-config-smoke",
    description: "Quartz config-backed Postgres smoke Library.",
  });
  await executeLibrarianTool(context, "librarian_update", {
    uri: "library://quartz-config-smoke/notes/smoke.md",
    content: "Quartz config Postgres smoke content",
  });
  const read = await executeLibrarianTool(context, "librarian_read", {
    uri: "library://quartz-config-smoke/notes/smoke.md",
  });
  assert.equal(
    readPath(read, ["content"]),
    "Quartz config Postgres smoke content",
  );
} finally {
  await postgresStorage?.close();
  if (originalQuartzPostgresUrl === undefined) {
    delete process.env.QUARTZ_POSTGRES_URL;
  } else {
    process.env.QUARTZ_POSTGRES_URL = originalQuartzPostgresUrl;
  }
  if (postgres && postgres.exitCode === null) {
    postgres.kill("SIGTERM");
    await once(postgres, "close");
  }
  await rm(workRoot, { recursive: true, force: true });
}

function preparedRuntime(workRootPath: string, localRootPath: string): PreparedRuntime {
  return {
    localRoot: localRootPath,
    conversationsLibrary: join(localRootPath, "knowledge-agent", "conversations"),
    memoryLibrary: join(localRootPath, "knowledge-agent", "memory"),
    conversationRoot: join(localRootPath, "knowledge-agent", "conversations", "config-test"),
    sessionFile: join(localRootPath, "knowledge-agent", "conversations", "config-test", "session.jsonl"),
    tmpStorageLibrariesRoot: join(workRootPath, "tmp-local-storage", "libraries"),
    sandboxWorkspace: join(workRootPath, "sandbox"),
    runtimeStorage: createLocalFileSystemStorage(),
  };
}

function requireCommand(name: string): string {
  const result = spawnSync("which", [name], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`Required command not found: ${name}`);
  }
  return result.stdout.trim();
}

function runCommand(command: string, args: string[]): void {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(
      `${command} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );
  }
}

async function availablePort(): Promise<number> {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const nextPort = address.port;
  server.close();
  await once(server, "close");
  return nextPort;
}

async function waitForPostgres(
  storage: PostgresStorage,
  stderr: () => string,
): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      await storage.ensureSchema();
      return;
    } catch (error) {
      lastError = error;
      await delay(100);
    }
  }
  throw new Error(
    `Postgres did not become ready: ${lastError instanceof Error ? lastError.message : String(lastError)}\n${stderr()}`,
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readPath(value: unknown, path: (string | number)[]): unknown {
  let current = value;
  for (const segment of path) {
    if (typeof segment === "number") {
      assert.ok(Array.isArray(current), `Expected array at ${String(segment)}`);
      current = current[segment];
      continue;
    }
    assert.ok(current && typeof current === "object", `Expected object at ${segment}`);
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}
