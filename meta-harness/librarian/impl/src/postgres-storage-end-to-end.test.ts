// Generated file. Do not edit directly; update the Spec first.
// Supports storage.postgres-driver: verifies Postgres can back Librarian storage.
// Supports storage.postgres-schema-bootstrap: verifies schema bootstrap against Postgres.
// Supports storage.postgres-deployment-configuration: verifies explicit table configuration against a local Postgres deployment.
// Supports librarian.postgres-backed-library-interface: verifies Library tools over Postgres.

import assert from "node:assert/strict";
import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from "node:child_process";
import { once } from "node:events";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLibrarianContext } from "./create-librarian-context.js";
import { createPostgresStorageFromConnectionString, type PostgresStorage } from "./create-postgres-storage.js";
import { executeLibrarianTool } from "./execute-librarian-tool.js";

const postgresCommand = requireCommand("postgres");
const initdbCommand = requireCommand("initdb");
const workRoot = await mkdtemp(join(tmpdir(), "librarian-postgres-"));
const dataRoot = join(workRoot, "data");
const socketRoot = join(workRoot, "socket");
const port = await availablePort();
const connectionString = `postgresql://postgres@127.0.0.1:${port}/postgres`;
let postgres: ChildProcessWithoutNullStreams | undefined;
let storage: PostgresStorage | undefined;

try {
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

  storage = await waitForPostgres(connectionString, () => stderr.join(""));
  const context = createLibrarianContext({
    storage,
    storageLocations: [
      {
        name: "postgres-test",
        description: "Postgres-backed storage location for Librarian integration verification.",
        driverName: "postgres",
        storage,
        capabilities: {
          readable: true,
          writable: true,
          deletable: true,
          queryable: true,
          blob: false,
        },
        libraryRootPath: "/libraries",
        discoveryMode: "resource-root-and-direct-children",
        discoveryExcludes: [],
        discoverLibraries: true,
        sourceUri: "library://repository/.meta-harness.json",
        guidanceUri: "library://meta-harness/storage/STORAGE.md",
      },
    ],
    actorUri: "actor://knowledge-agent",
    sessionId: "postgres-storage-integration",
  });

  const created = await executeLibrarianTool(context, "librarian_create_library", {
    storageLocationName: "postgres-test",
    name: "pg-fixture",
    description: "Fixture Library stored in Postgres.",
  });
  assert.equal(readPath(created, ["library", "uri"]), "library://pg-fixture");

  const listed = await executeLibrarianTool(context, "librarian_list_libraries", {});
  assert.ok(
    arrayAt(listed, ["libraries"]).some(
      (library) => readPath(library, ["uri"]) === "library://pg-fixture",
    ),
  );

  const content = "Postgres-backed Library resource for information trading search.\n";
  const updated = await executeLibrarianTool(context, "librarian_update", {
    uri: "library://pg-fixture/notes/information.md",
    content,
  });
  assert.equal(readPath(updated, ["uri"]), "library://pg-fixture/notes/information.md");

  const read = await executeLibrarianTool(context, "librarian_read", {
    uri: "library://pg-fixture/notes/information.md",
  });
  assert.equal(readPath(read, ["content"]), content);

  const files = await executeLibrarianTool(context, "librarian_list_files", {
    uri: "library://pg-fixture",
    recursive: true,
  });
  assert.ok(
    arrayAt(files, ["files"]).some(
      (file) => readPath(file, ["uri"]) === "library://pg-fixture/notes/information.md",
    ),
  );

  const searched = await executeLibrarianTool(context, "librarian_search", {
    libraryUriPatterns: ["library://pg-fixture"],
    query: "information trading",
    limit: 10,
  });
  assert.ok(
    arrayAt(readPath(searched, ["results", 0]), ["matches"]).some(
      (match) => readPath(match, ["uri"]) === "library://pg-fixture/notes/information.md",
    ),
  );

  await executeLibrarianTool(context, "librarian_add_tags", {
    scopeUri: "library://pg-fixture/notes",
    tags: ["information-trading"],
  });
  const tagQuery = await executeLibrarianTool(context, "librarian_query_by_tags", {
    libraryUris: ["library://pg-fixture"],
    tags: ["information-trading"],
  });
  assert.equal(
    readPath(tagQuery, ["results", 0, "matches", 0, "scopeUri"]),
    "library://pg-fixture/notes",
  );
} finally {
  await storage?.close();
  if (postgres && postgres.exitCode === null) {
    postgres.kill("SIGTERM");
    await once(postgres, "close");
  }
  await rm(workRoot, { recursive: true, force: true });
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
  const port = address.port;
  server.close();
  await once(server, "close");
  return port;
}

async function waitForPostgres(
  connectionString: string,
  stderr: () => string,
): Promise<PostgresStorage> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const storage = createPostgresStorageFromConnectionString({
      connectionString,
      tableName: "meta_harness_test_resources",
    });
    try {
      await storage.ensureSchema();
      return storage;
    } catch (error) {
      lastError = error;
      await storage.close();
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

function arrayAt(value: unknown, path: (string | number)[]): unknown[] {
  const array = path.length === 0 ? value : readPath(value, path);
  assert.ok(Array.isArray(array));
  return array;
}
