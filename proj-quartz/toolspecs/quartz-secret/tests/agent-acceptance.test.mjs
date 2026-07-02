// Generated file. Do not edit directly; update the ToolSpec first.
// Supports ToolSpec: quartz_secret
// Harness-Acceptance: proj-quartz.acceptance.secret-create-and-reveal
// This live replay calls the configured OpenAI provider. Run it only after
// explicit human/operator approval for external provider use.

import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createPostgresStorageFromConnectionString,
} from "../../../../meta-harness/librarian/impl/dist/index.js";

const acceptanceSecret = "qz_acceptance_secret_12345";
const firstConversationMessage =
  `Here is my Acme API key: ${acceptanceSecret}. Please remember it as my Acme API key.`;
const secondConversationMessage = "What is my Acme API key?";
const userActor = "actor://proj-quartz/user/test-user";
const organizationActor = "actor://proj-quartz/organization/test-org";
const actorUris = [
  userActor,
  organizationActor,
  `${organizationActor}/member`,
  "actor://proj-quartz/agent",
];
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const cliPath = join(repoRoot, "meta-harness/knowledge-agent/impl/dist/cli.js");
const projectConfig = "proj-quartz/.meta-harness.json";

if (process.env.QUARTZ_SECRET_AGENT_ACCEPTANCE_APPROVED !== "true") {
  throw new Error(
    "Set QUARTZ_SECRET_AGENT_ACCEPTANCE_APPROVED=true only after explicit human/operator approval for external provider use.",
  );
}

if (!process.env.OPENAI_API_KEY?.trim()) {
  throw new Error(
    "OPENAI_API_KEY and explicit approval for external provider use are required for Quartz Secret agent acceptance replay.",
  );
}

const postgresCommand = requireCommand("postgres");
const initdbCommand = requireCommand("initdb");
const workRoot = await mkdtemp(join(tmpdir(), "quartz-secret-agent-"));
const dataRoot = join(workRoot, "data");
const port = await availablePort();
const socketRoot = join("/tmp", `qz-secret-agent-${process.pid}-${port}`);
const connectionString = `postgresql://postgres@127.0.0.1:${port}/postgres`;
let postgres;
let inspectionStorage;

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
  const postgresStderr = [];
  postgres.stderr.setEncoding("utf8");
  postgres.stderr.on("data", (chunk) => postgresStderr.push(chunk));

  const env = quartzAgentEnv(connectionString);
  await waitForPostgres(connectionString, env, () => postgresStderr.join(""));

  const storeOutput = await runKnowledgeAgent({
    env,
    conversationId: "quartz-secret-agent-store",
    turnId: "store-secret",
    message: firstConversationMessage,
  });
  assert.doesNotMatch(
    storeOutput,
    new RegExp(acceptanceSecret),
    "Secret creation acknowledgement must not echo plaintext.",
  );

  const revealOutput = await runKnowledgeAgent({
    env,
    conversationId: "quartz-secret-agent-reveal",
    turnId: "reveal-secret",
    message: secondConversationMessage,
  });
  assert.match(
    revealOutput,
    new RegExp(acceptanceSecret),
    "Second conversation should reveal the requested Secret.",
  );

  inspectionStorage = createSecretTestStorage(connectionString, env);
  const persistedFiles = await readAllFiles(inspectionStorage, "/libraries");
  assert.ok(
    persistedFiles.some((file) =>
      file.path.includes("/libraries/organizations/test-org/users/test-user/secrets/quartz-secret-")
    ),
    "Personal Secret resources should live under the active organization and user secrets root.",
  );
  assert.equal(
    persistedFiles.some((file) => /^\/libraries\/quartz-secret-[^/]+\//.test(file.path)),
    false,
    "Secret Libraries must not be stored directly under /libraries.",
  );
  const leaked = persistedFiles.filter((file) => file.content.includes(acceptanceSecret));
  assert.deepEqual(
    leaked.map((file) => file.path),
    [],
    "Persisted Postgres resources must not contain the plaintext acceptance Secret.",
  );

  console.log(JSON.stringify({
    ok: true,
    firstConversationMessage,
    secondConversationMessage,
    storeOutput,
    revealOutput,
  }, null, 2));
} finally {
  await inspectionStorage?.close?.();
  if (postgres && postgres.exitCode === null) {
    postgres.kill("SIGTERM");
    await once(postgres, "close");
  }
  await rm(workRoot, { recursive: true, force: true });
  await rm(socketRoot, { recursive: true, force: true });
}

function quartzAgentEnv(connectionStringValue) {
  return {
    ...process.env,
    QUARTZ_POSTGRES_URL: connectionStringValue,
    QUARTZ_USER_SECRET_ENCRYPTION_KEY:
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    QUARTZ_USER_SECRET_ENCRYPTION_KEY_ID: "agent-acceptance-v1",
    META_HARNESS_ACTIVE_ACTOR_URI: userActor,
    META_HARNESS_ACTIVE_ACTOR_URIS: actorUris.join("\n"),
    META_HARNESS_DEFAULT_READ_ACTORS: userActor,
    META_HARNESS_DEFAULT_UPDATE_ACTORS: userActor,
    META_HARNESS_CONVERSATION_LIBRARY_ROOT_PATH:
      "/libraries/organizations/test-org/users/test-user/knowledge-agent-conversations",
  };
}

async function runKnowledgeAgent(input) {
  const child = spawn(process.execPath, [
    cliPath,
    "run",
    "--repo-root",
    repoRoot,
    "--project-config",
    projectConfig,
    "--conversation-id",
    input.conversationId,
    "--turn-id",
    input.turnId,
    "--model",
    "gpt-5.4-mini",
    "--reasoning-effort",
    "low",
    "--goal",
    input.message,
    "--latest-user-message",
    input.message,
  ], {
    cwd: repoRoot,
    env: input.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const stdout = [];
  const stderr = [];
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => stdout.push(chunk));
  child.stderr.on("data", (chunk) => stderr.push(chunk));
  const timeout = setTimeout(() => {
    child.kill("SIGTERM");
  }, 240_000);
  try {
    const [code] = await once(child, "close");
    const output = stdout.join("").trim();
    const errors = stderr.join("").trim();
    if (code !== 0) {
      throw new Error(`Knowledge Agent exited ${code}: ${errors || output}`);
    }
    return output;
  } finally {
    clearTimeout(timeout);
  }
}

function createSecretTestStorage(connectionStringValue, env) {
  return createPostgresStorageFromConnectionString({
    connectionString: connectionStringValue,
    schemaName: "quartz_core",
    tableName: "resources",
    autoEnsureSchema: true,
    actorUris: env.META_HARNESS_ACTIVE_ACTOR_URIS.split("\n"),
    defaultReadActors: [userActor],
    defaultUpdateActors: [userActor],
  });
}

async function readAllFiles(storage, root) {
  if (!(await storage.exists(root))) {
    return [];
  }
  const entries = await storage.listDirectory(root);
  const files = [];
  for (const entry of entries) {
    const path = `${root}/${entry.name}`;
    if (entry.isDirectory) {
      files.push(...await readAllFiles(storage, path));
      continue;
    }
    files.push({ path, content: await storage.readText(path) });
  }
  return files;
}

async function waitForPostgres(connectionStringValue, env, stderrText) {
  const deadline = Date.now() + 15_000;
  let lastError;
  while (Date.now() < deadline) {
    const storage = createSecretTestStorage(connectionStringValue, env);
    try {
      await storage.exists("/");
      await storage.close?.();
      return;
    } catch (error) {
      lastError = error;
      await storage.close?.();
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error(
    `Postgres did not become ready: ${lastError?.message ?? "unknown error"}\n${stderrText()}`,
  );
}

function requireCommand(name) {
  const result = spawnSync("which", [name], { encoding: "utf8" });
  if (result.status !== 0 || !result.stdout.trim()) {
    throw new Error(`Required command not found: ${name}`);
  }
  return result.stdout.trim();
}

function runCommand(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(
      `${command} failed with status ${result.status}: ${result.stderr || result.stdout}`,
    );
  }
}

async function availablePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
  if (!address || typeof address === "string") {
    throw new Error("Unable to allocate a local Postgres port.");
  }
  return address.port;
}
