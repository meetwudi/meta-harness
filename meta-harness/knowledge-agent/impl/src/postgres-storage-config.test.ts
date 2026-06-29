// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.local-filesystem-storage-compatibility: verifies filesystem storage remains available without Postgres env.
// Supports knowledge-agent.project-config-selection: verifies project config selection scopes storage discovery.
// Supports storage.env-gated-storage-locations: verifies optional Postgres locations are gated by deployment env.
// Supports storage.project-scoped-storage-locations: verifies selected project config locations do not inherit root machine-local locations.
// Supports storage.postgres-deployment-configuration: verifies env-provided Postgres connection configuration.
// Supports proj-quartz.postgres-backed-libraries: verifies configured Postgres-backed Libraries through Librarian.
// Supports proj-quartz.quartz-agent-actor: verifies Quartz storage grants for the project actor.
// Harness-Requirement: knowledge-agent.project-config-selection
// Harness-Requirement: storage.project-scoped-storage-locations

import assert from "node:assert/strict";
import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from "node:child_process";
import { once } from "node:events";
import { readFileSync } from "node:fs";
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
const originalQuartzPostgresUrl = process.env.QUARTZ_POSTGRES_URL;
const quartzAgentActor = "actor://proj-quartz/agent";
const quartzMemoryCuratorActor = "actor://proj-quartz/memory-curator";
const workRoot = await mkdtemp(join(tmpdir(), "ka-pg-"));
const sourceRepoRoot = resolve(process.cwd(), "../../..");
const repoRoot = join(workRoot, "repo");
const projectRoot = join(repoRoot, "proj-quartz");
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
          name: "proj-quartz",
          localRoot,
          actorUri: quartzAgentActor,
        },
        runtime: {
          memoryCurator: {
            enabled: true,
            actorUri: quartzMemoryCuratorActor,
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
                  actors: [quartzAgentActor, quartzMemoryCuratorActor],
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
                  actors: [quartzAgentActor, quartzMemoryCuratorActor],
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
                  actors: [quartzAgentActor, quartzMemoryCuratorActor],
                  capabilities: ["read", "write", "delete", "query"],
                },
              ],
              libraryRootPath: "/libraries",
              discoveryMode: "resource-root-and-direct-children",
              discoveryExcludes: [],
              discoverLibraries: true,
              defaultForLibraryCreation: true,
              createdLibraryReadActors: [quartzAgentActor, quartzMemoryCuratorActor],
              createdLibraryUpdateActors: [quartzAgentActor, quartzMemoryCuratorActor],
            },
          ],
        },
      },
      null,
      2,
    ),
  );

  const quartzConfig = loadMetaHarnessConfig(repoRoot, "proj-quartz/.meta-harness.json");
  assert.deepEqual(resolveMemoryCuratorConfig(quartzConfig), {
    enabled: true,
    actorUri: quartzMemoryCuratorActor,
    recentMessageLimit: 10,
    latestUserMessageOnly: true,
  });

  const runtime = preparedRuntime(workRoot, localRoot);
  const filesystemStorage = createLocalFileSystemStorage();
  delete process.env.QUARTZ_POSTGRES_URL;
  const withoutPostgres = loadLocalStorageLocations({
    repoRootPath: repoRoot,
    projectConfigPath: "proj-quartz/.meta-harness.json",
    runtime,
    storage: filesystemStorage,
    actorUris: [quartzAgentActor],
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
    actorUris: [quartzAgentActor],
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
    actorUri: quartzAgentActor,
    sessionId: "postgres-storage-config",
  });
  await executeLibrarianTool(context, "librarian_create_library", {
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

  const firstUserMessage =
    "I want a stocks Library for notes about stocks I am watching.";
  const secondUserMessage =
    "I want the stocks we talk about to be actively observed and captured, organized by stock folder, like FB and QCOM.";
  assert.equal(firstUserMessage.includes("TOML"), false);
  assert.equal(secondUserMessage.includes("TOML"), false);
  assert.equal(secondUserMessage.includes("MEMORY.toml"), false);
  const quartzLibraryCreationPolicy = readFileSync(
    resolve(sourceRepoRoot, "proj-quartz", "harness", "LIBRARY-CREATION.toml"),
    "utf8",
  );
  assert.match(quartzLibraryCreationPolicy, /ask_user_to_confirm_storage_location = false/);
  assert.match(quartzLibraryCreationPolicy, /expose_storage_location_in_user_response = false/);
  assert.match(quartzLibraryCreationPolicy, /require_description_before_create = true/);

  const stocksCreated = await executeLibrarianTool(context, "librarian_create_library", {
    name: "stocks",
    description: "Stock observation memory for public companies the user is watching.",
  });
  assert.equal(readPath(stocksCreated, ["storageLocation", "name"]), "quartz-postgres");
  await executeLibrarianTool(context, "librarian_update", {
    uri: "library://stocks/MEMORY.toml",
    content: [
      "# This is a Harness primitive.",
      "# See also: library://meta-harness",
      "",
      "instructions = [",
      '  "Capture only user-stated stock observations and preferences from conversation.",',
      '  "Use one folder per stock symbol under symbols/{symbol}/.",',
      '  "Use the stock symbol token exactly as the user supplied it for the folder name, including legacy or common symbols such as FB.",',
      '  "A matching fact under a different canonicalized symbol folder does not satisfy the user-supplied symbol folder.",',
      '  "Within each stock folder, store sequential memory by day using YYYY-MM-DD.md files.",',
      '  "Each entry must include learned_at, learned_from, and the exact user-stated fact or observation.",',
      '  "Inspect existing memory before writing and do not duplicate facts already captured.",',
      '  "Do not invent investment analysis, recommendations, or conclusions.",',
      "]",
      "",
      "[curation]",
      "auto_curated = true",
      "",
      "[[collections]]",
      'name = "symbols"',
      'location = "symbols/{symbol}/"',
      "instructions = [",
      '  "Treat this location as the folder for one stock symbol.",',
      '  "Use the stock symbol token exactly as supplied by the user when choosing the symbol folder.",',
      '  "If the same fact exists under a different canonicalized symbol folder, still write it here when this is the user-supplied symbol folder.",',
      '  "Store sequential daily memory inside the stock folder using files named YYYY-MM-DD.md.",',
      '  "Append new entries in chronological order within the day file when multiple facts are learned on the same day.",',
      '  "Each entry must include learned_at, learned_from, and statement fields or equivalent labeled lines.",',
      "]",
      "",
    ].join("\n"),
  });
  await executeLibrarianTool(context, "librarian_update", {
    uri: "library://stocks/symbols/FB/2026-06-26.md",
    content: [
      "# FB - 2026-06-26",
      "",
      "## 2026-06-26",
      "",
      "- learned_at: 2026-06-26",
      "- learned_from: user",
      "- statement: FB is one of the example stock symbols to organize.",
      "",
    ].join("\n"),
  });

  const stocksManifest = await executeLibrarianTool(context, "librarian_read", {
    uri: "library://stocks/LIBRARY.toml",
  });
  const stocksManifestContent = String(readPath(stocksManifest, ["content"]));
  assert.match(
    stocksManifestContent,
    /read_actors = \["actor:\/\/proj-quartz\/agent","actor:\/\/proj-quartz\/memory-curator"\]/,
  );
  assert.match(
    stocksManifestContent,
    /update_actors = \["actor:\/\/proj-quartz\/agent","actor:\/\/proj-quartz\/memory-curator"\]/,
  );

  const curatorLocations = loadLocalStorageLocations({
    repoRootPath: repoRoot,
    projectConfigPath: "proj-quartz/.meta-harness.json",
    runtime,
    storage: filesystemStorage,
    actorUris: [quartzMemoryCuratorActor],
  });
  curatorPostgresStorage = curatorLocations.find((location) => location.name === "quartz-postgres")
    ?.storage as PostgresStorage | undefined;
  assert.ok(curatorPostgresStorage);
  const curatorContext = createLibrarianContext({
    storage: filesystemStorage,
    storageLocations: curatorLocations,
    actorUri: quartzMemoryCuratorActor,
    sessionId: "postgres-memory-curator-config",
  });
  const curatorList = await executeLibrarianTool(curatorContext, "librarian_list_libraries", {});
  assert.ok(
    arrayAt(curatorList, ["libraries"]).some(
      (library) =>
        readPath(library, ["uri"]) === "library://stocks" &&
        readPath(library, ["writable"]) === true,
    ),
  );
  const stocksMemory = await executeLibrarianTool(curatorContext, "librarian_read", {
    uri: "library://stocks/MEMORY.toml",
  });
  assert.match(String(readPath(stocksMemory, ["content"])), /\[curation\]/);
  assert.match(String(readPath(stocksMemory, ["content"])), /auto_curated = true/);
  assert.match(String(readPath(stocksMemory, ["content"])), /location = "symbols\/\{symbol\}\/"/);
  assert.match(String(readPath(stocksMemory, ["content"])), /symbol token exactly as the user supplied it/);
  assert.match(String(readPath(stocksMemory, ["content"])), /different canonicalized symbol folder/);
  assert.match(String(readPath(stocksMemory, ["content"])), /YYYY-MM-DD\.md/);
  assert.match(String(readPath(stocksMemory, ["content"])), /learned_at/);
  assert.match(String(readPath(stocksMemory, ["content"])), /learned_from/);
  const curatorFiles = await executeLibrarianTool(curatorContext, "librarian_list_files", {
    uri: "library://stocks",
    recursive: true,
  });
  assert.ok(
    arrayAt(curatorFiles, ["files"]).some(
      (file) => readPath(file, ["uri"]) === "library://stocks/symbols/FB/2026-06-26.md",
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
    memoryCurationLibraries: [{ uri: "library://stocks" }],
  });
  assert.deepEqual(readPath(routedUpdate, ["memoryCurationLibraryUris"]), [
    "library://stocks",
  ]);
  assert.deepEqual(conversationState.memoryCurationLibraryUris(), [
    "library://stocks",
  ]);
  assert.equal(conversationState.currentToml().includes("memoryCurationLibraries"), false);
  assert.equal(conversationState.currentToml().includes("memory_curation"), false);

  const contextualMainAgentGoal = [
    "Recent chat transcript:",
    `user: ${firstUserMessage}`,
    "assistant: Created library://stocks.",
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
          content: [{ type: "output_text", text: "Created library://stocks." }],
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
    actorUri: quartzMemoryCuratorActor,
    recentMessageLimit: 10,
    latestUserMessage: secondUserMessage,
    recentContext,
    memoryCurationLibraryUris: conversationState.memoryCurationLibraryUris(),
  });
  assert.match(curatorPrompt, /## Memory Curator Mode/);
  assert.match(curatorPrompt, /Active Memory Curator Actor: `actor:\/\/proj-quartz\/memory-curator`/);
  assert.match(curatorPrompt, /Learn only from the latest user message shown below\./);
  assert.match(curatorPrompt, /Use the recent conversation context only to understand references and avoid/);
  assert.match(curatorPrompt, /Inspect existing memory before writing\./);
  assert.match(curatorPrompt, /Latest user message only: `true`/);
  assert.match(curatorPrompt, new RegExp(escapeRegExp(secondUserMessage)));
  assert.match(curatorPrompt, /Target Memory curation Libraries from the main agent state:/);
  assert.ok(curatorPrompt.includes('[\n  "library://stocks"\n]'));
  assert.equal(curatorPrompt.includes("Recent chat transcript:"), false);
} finally {
  await curatorPostgresStorage?.close();
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
    memoryCurator: {
      enabled: true,
      actorUri: quartzMemoryCuratorActor,
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
