// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.local-filesystem-storage-compatibility: verifies filesystem storage remains available without Postgres env.
// Supports knowledge-agent.project-config-selection: verifies project config selection scopes storage discovery.
// Supports storage.env-gated-storage-locations: verifies optional Postgres locations are gated by deployment env.
// Supports storage.project-scoped-storage-locations: verifies selected project config locations do not inherit root machine-local locations.
// Supports storage.postgres-deployment-configuration: verifies env-provided Postgres connection configuration.
// Supports storage.default-library-creation-location: verifies configured default Library creation through Librarian.
// Supports storage.created-library-governance-template: verifies created Libraries use configured actor governance templates.
// Supports knowledge-agent.library-scoped-memory-curator: verifies generic Memory Curator routing and prompt boundaries.
// Harness-Requirement: knowledge-agent.project-config-selection
// Harness-Requirement: storage.project-scoped-storage-locations

import assert from "node:assert/strict";
import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from "node:child_process";
import { once } from "node:events";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  createLibrarianContext,
  createLocalFileSystemStorage,
  executeLibrarianTool,
  type PostgresStorage,
} from "../../../librarian/impl/dist/index.js";
import {
  loadMetaHarnessConfig,
  resolveMemoryCuratorConfig,
} from "./load-meta-harness-config.js";
import { ConversationStateRuntime } from "./conversation-state.js";
import { loadLocalStorageLocations } from "./load-local-storage-locations.js";
import type { KnowledgeAgentSession } from "./local-jsonl-session.js";
import { memoryCuratorRecentContext } from "./memory-curator-recent-context.js";
import { buildMemoryCuratorPrompt, runMemoryCurator } from "./run-memory-curator.js";
import type { PreparedRuntime, ProviderRunOptions } from "./types.js";

const postgresCommand = requireCommand("postgres");
const initdbCommand = requireCommand("initdb");
const testPostgresEnvName = "META_HARNESS_TEST_POSTGRES_URL";
const originalTestPostgresUrl = process.env[testPostgresEnvName];
const fixtureAgentActor = "actor://fixture-project/agent";
const fixtureMemoryCuratorActor = "actor://fixture-project/memory-curator";
const workRoot = await mkdtemp(join(tmpdir(), "ka-pg-"));
const sourceRepoRoot = resolve(process.cwd(), "../../..");
const repoRoot = join(workRoot, "repo");
const projectRoot = join(repoRoot, "fixture-project");
const localRoot = join(workRoot, "local");
const dataRoot = join(workRoot, "data");
const socketRoot = join(workRoot, "socket");
const port = await availablePort();
const connectionString = `postgresql://postgres@127.0.0.1:${port}/postgres`;
let postgres: ChildProcessWithoutNullStreams | undefined;
let postgresStorage: PostgresStorage | undefined;
let curatorPostgresStorage: PostgresStorage | undefined;

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
          name: "fixture-project",
          localRoot,
          actorUri: fixtureAgentActor,
        },
        runtime: {
          memoryCurator: {
            enabled: true,
            actorUri: fixtureMemoryCuratorActor,
            recentMessageLimit: 10,
            latestUserMessageOnly: true,
          },
        },
        storage: {
          locations: [
            {
              name: "project",
              description: "Project filesystem fixture storage.",
              driverName: "filesystem",
              grants: [
                {
                  actors: [fixtureAgentActor, fixtureMemoryCuratorActor],
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
                  actors: [fixtureAgentActor, fixtureMemoryCuratorActor],
                  capabilities: ["read", "write", "delete", "query", "blob"],
                },
              ],
              libraryRootPath: "{{tmpStorageLibrariesRoot}}",
              discoveryMode: "filesystem-root-and-direct-children",
              discoveryExcludes: [],
              discoverLibraries: true,
            },
            {
              name: "fixture-postgres",
              description: "Postgres fixture storage.",
              driverName: "postgres",
              enabledWhenEnv: testPostgresEnvName,
              connectionStringEnv: testPostgresEnvName,
              schemaName: "meta_harness",
              tableName: "resources",
              grants: [
                {
                  actors: [fixtureAgentActor, fixtureMemoryCuratorActor],
                  capabilities: ["read", "write", "delete", "query"],
                },
              ],
              libraryRootPath: "/libraries",
              discoveryMode: "resource-root-and-direct-children",
              discoveryExcludes: [],
              discoverLibraries: true,
              defaultForLibraryCreation: true,
              createdLibraryReadActors: [fixtureAgentActor, fixtureMemoryCuratorActor],
              createdLibraryUpdateActors: [fixtureAgentActor, fixtureMemoryCuratorActor],
            },
          ],
        },
      },
      null,
      2,
    ),
  );

  const fixtureConfig = loadMetaHarnessConfig(repoRoot, "fixture-project/.meta-harness.json");
  assert.deepEqual(resolveMemoryCuratorConfig(fixtureConfig), {
    enabled: true,
    actorUri: fixtureMemoryCuratorActor,
    recentMessageLimit: 10,
    latestUserMessageOnly: true,
  });

  const runtime = preparedRuntime(workRoot, localRoot);
  const filesystemStorage = createLocalFileSystemStorage();
  delete process.env[testPostgresEnvName];
  const withoutPostgres = loadLocalStorageLocations({
    repoRootPath: repoRoot,
    projectConfigPath: "fixture-project/.meta-harness.json",
    runtime,
    storage: filesystemStorage,
    actorUris: [fixtureAgentActor],
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
  process.env[testPostgresEnvName] = connectionString;

  const withPostgres = loadLocalStorageLocations({
    repoRootPath: repoRoot,
    projectConfigPath: "fixture-project/.meta-harness.json",
    runtime,
    storage: filesystemStorage,
    actorUris: [fixtureAgentActor],
  });
  assert.deepEqual(
    withPostgres.map((location) => location.name),
    ["project", "tmp-local", "fixture-postgres"],
  );

  postgresStorage = withPostgres.find((location) => location.name === "fixture-postgres")
    ?.storage as PostgresStorage | undefined;
  assert.ok(postgresStorage);
  await waitForPostgres(postgresStorage, () => stderr.join(""));

  const context = createLibrarianContext({
    storage: filesystemStorage,
    storageLocations: withPostgres,
    actorUri: fixtureAgentActor,
    sessionId: "postgres-storage-config",
  });
  await executeLibrarianTool(context, "librarian_create_library", {
    name: "config-smoke",
    description: "Config-backed Postgres smoke Library.",
  });
  await executeLibrarianTool(context, "librarian_update", {
    uri: "library://config-smoke/notes/smoke.md",
    content: "Config Postgres smoke content",
  });
  const read = await executeLibrarianTool(context, "librarian_read", {
    uri: "library://config-smoke/notes/smoke.md",
  });
  assert.equal(
    readPath(read, ["content"]),
    "Config Postgres smoke content",
  );

  const firstUserMessage =
    "I want an observations Library for notes I want to remember.";
  const secondUserMessage =
    "Please organize observations by topic and keep dated entries.";
  assert.equal(firstUserMessage.includes("TOML"), false);
  assert.equal(secondUserMessage.includes("TOML"), false);
  assert.equal(secondUserMessage.includes("MEMORY.toml"), false);

  const observationsCreated = await executeLibrarianTool(context, "librarian_create_library", {
    name: "observations",
    description: "Observation memory for notes the user wants remembered.",
  });
  assert.equal(readPath(observationsCreated, ["storageLocation", "name"]), "fixture-postgres");
  await executeLibrarianTool(context, "librarian_update", {
    uri: "library://observations/MEMORY.toml",
    content: [
      "# This is a Harness primitive.",
      "# See also: library://meta-harness",
      "",
      "instructions = [",
      '  "Capture only user-stated observations from conversation.",',
      '  "Use one folder per topic under topics/{topic}/.",',
      '  "Use the topic token exactly as the user supplied it when choosing the folder name.",',
      '  "Within each topic folder, store sequential memory by day using YYYY-MM-DD.md files.",',
      '  "Each entry must include learned_at, learned_from, and the exact user-stated fact or observation.",',
      '  "Inspect existing memory before writing and do not duplicate facts already captured.",',
      '  "Do not invent analysis, recommendations, or conclusions.",',
      "]",
      "",
      "[curation]",
      "auto_curated = true",
      "",
      "[[collections]]",
      'name = "topics"',
      'location = "topics/{topic}/"',
      "instructions = [",
      '  "Treat this location as the folder for one topic.",',
      '  "Use the topic token exactly as supplied by the user when choosing the topic folder.",',
      '  "Store sequential daily memory inside the topic folder using files named YYYY-MM-DD.md.",',
      '  "Append new entries in chronological order within the day file when multiple facts are learned on the same day.",',
      '  "Each entry must include learned_at, learned_from, and statement fields or equivalent labeled lines.",',
      "]",
      "",
    ].join("\n"),
  });
  await executeLibrarianTool(context, "librarian_update", {
    uri: "library://observations/topics/example-topic/2026-06-26.md",
    content: [
      "# example-topic - 2026-06-26",
      "",
      "## 2026-06-26",
      "",
      "- learned_at: 2026-06-26",
      "- learned_from: user",
      "- statement: example-topic is a fixture topic to organize.",
      "",
    ].join("\n"),
  });

  const observationsManifest = await executeLibrarianTool(context, "librarian_read", {
    uri: "library://observations/LIBRARY.toml",
  });
  const observationsManifestContent = String(readPath(observationsManifest, ["content"]));
  assert.match(
    observationsManifestContent,
    /read_actors = \["actor:\/\/fixture-project\/agent","actor:\/\/fixture-project\/memory-curator"\]/,
  );
  assert.match(
    observationsManifestContent,
    /update_actors = \["actor:\/\/fixture-project\/agent","actor:\/\/fixture-project\/memory-curator"\]/,
  );

  const curatorLocations = loadLocalStorageLocations({
    repoRootPath: repoRoot,
    projectConfigPath: "fixture-project/.meta-harness.json",
    runtime,
    storage: filesystemStorage,
    actorUris: [fixtureMemoryCuratorActor],
  });
  curatorPostgresStorage = curatorLocations.find((location) => location.name === "fixture-postgres")
    ?.storage as PostgresStorage | undefined;
  assert.ok(curatorPostgresStorage);
  const curatorContext = createLibrarianContext({
    storage: filesystemStorage,
    storageLocations: curatorLocations,
    actorUri: fixtureMemoryCuratorActor,
    sessionId: "postgres-memory-curator-config",
  });
  const curatorList = await executeLibrarianTool(curatorContext, "librarian_list_libraries", {});
  assert.ok(
    arrayAt(curatorList, ["libraries"]).some(
      (library) =>
        readPath(library, ["uri"]) === "library://observations" &&
        readPath(library, ["writable"]) === true,
    ),
  );
  const observationsMemory = await executeLibrarianTool(curatorContext, "librarian_read", {
    uri: "library://observations/MEMORY.toml",
  });
  assert.match(String(readPath(observationsMemory, ["content"])), /\[curation\]/);
  assert.match(String(readPath(observationsMemory, ["content"])), /auto_curated = true/);
  assert.match(String(readPath(observationsMemory, ["content"])), /location = "topics\/\{topic\}\/"/);
  assert.match(String(readPath(observationsMemory, ["content"])), /topic token exactly as the user supplied it/);
  assert.match(String(readPath(observationsMemory, ["content"])), /YYYY-MM-DD\.md/);
  assert.match(String(readPath(observationsMemory, ["content"])), /learned_at/);
  assert.match(String(readPath(observationsMemory, ["content"])), /learned_from/);
  const curatorFiles = await executeLibrarianTool(curatorContext, "librarian_list_files", {
    uri: "library://observations",
    recursive: true,
  });
  assert.ok(
    arrayAt(curatorFiles, ["files"]).some(
      (file) => readPath(file, ["uri"]) === "library://observations/topics/example-topic/2026-06-26.md",
    ),
  );

  const conversationState = await ConversationStateRuntime.create({
    runtime,
    librarianContext: context,
  });
  const emptyRoutingUpdate = await conversationState.update({
    memoryCurationLibraries: [],
  });
  assert.deepEqual(readPath(emptyRoutingUpdate, ["memoryCurationLibraryUris"]), []);
  assert.deepEqual(conversationState.memoryCurationLibraryUris(), []);
  const skippedCurator = await runMemoryCurator({
    memoryCurator: runtime.memoryCurator,
    conversationState,
  } as unknown as ProviderRunOptions);
  assert.equal(skippedCurator, undefined);

  const routedUpdate = await conversationState.update({
    memoryCurationLibraries: [{ uri: "library://observations" }],
  });
  assert.deepEqual(readPath(routedUpdate, ["memoryCurationLibraryUris"]), [
    "library://observations",
  ]);
  assert.deepEqual(conversationState.memoryCurationLibraryUris(), [
    "library://observations",
  ]);
  assert.equal(conversationState.currentToml().includes("memoryCurationLibraries"), false);
  assert.equal(conversationState.currentToml().includes("memory_curation"), false);

  const contextualMainAgentGoal = [
    "Recent chat transcript:",
    `user: ${firstUserMessage}`,
    "assistant: Created library://observations.",
    "",
    "Current user request:",
    secondUserMessage,
    "",
    "Use the transcript to resolve short follow-ups.",
  ].join("\n");
  assert.notEqual(contextualMainAgentGoal, secondUserMessage);
  const recentContextSession: KnowledgeAgentSession = {
    getSessionId: async () => "curator-prompt-boundary",
    getItems: async (limit) => {
      assert.equal(limit, 10);
      return [
        {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: firstUserMessage }],
        },
        {
          type: "message",
          role: "assistant",
          status: "completed",
          content: [{ type: "output_text", text: "Created library://observations." }],
        },
        {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: secondUserMessage }],
        },
      ];
    },
    addItems: async () => {},
    popItem: async () => undefined,
    clearSession: async () => {},
  };
  const recentContext = await memoryCuratorRecentContext(recentContextSession, 10);
  const curatorPrompt = buildMemoryCuratorPrompt({
    repoRoot: sourceRepoRoot,
    actorUri: fixtureMemoryCuratorActor,
    recentMessageLimit: 10,
    latestUserMessage: secondUserMessage,
    recentContext,
    memoryCurationLibraryUris: conversationState.memoryCurationLibraryUris(),
  });
  assert.match(curatorPrompt, /## Memory Curator Mode/);
  assert.match(curatorPrompt, /Active Memory Curator Actor: `actor:\/\/fixture-project\/memory-curator`/);
  assert.match(curatorPrompt, /Learn only from the latest user message shown below\./);
  assert.match(curatorPrompt, /Use the recent conversation context only to understand references and avoid/);
  assert.match(curatorPrompt, /Inspect existing memory before writing\./);
  assert.match(curatorPrompt, /Latest user message only: `true`/);
  assert.match(curatorPrompt, new RegExp(escapeRegExp(secondUserMessage)));
  assert.match(curatorPrompt, /Target Memory curation Libraries from the main agent state:/);
  assert.ok(curatorPrompt.includes('[\n  "library://observations"\n]'));
  assert.equal(curatorPrompt.includes("Recent chat transcript:"), false);
} finally {
  await curatorPostgresStorage?.close();
  await postgresStorage?.close();
  if (originalTestPostgresUrl === undefined) {
    delete process.env[testPostgresEnvName];
  } else {
    process.env[testPostgresEnvName] = originalTestPostgresUrl;
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
    memoryCurator: {
      enabled: true,
      actorUri: fixtureMemoryCuratorActor,
      recentMessageLimit: 10,
      latestUserMessageOnly: true,
    },
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

function arrayAt(value: unknown, path: (string | number)[]): unknown[] {
  const array = path.length === 0 ? value : readPath(value, path);
  assert.ok(Array.isArray(array));
  return array;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
