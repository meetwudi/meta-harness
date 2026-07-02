// Generated file. Do not edit directly; update the ToolSpec first.
// Supports ToolSpec: quartz_secret
// Harness-Requirement: proj-quartz.secret-primitive-onboarding
// Harness-Requirement: proj-quartz.secret-scope
// Harness-Requirement: proj-quartz.secret-use-reveal-policy
// Harness-Requirement: proj-quartz.secret-encrypted-library-storage

import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createLibrarianContext,
  createLocalFileSystemStorage,
  createPostgresStorageFromConnectionString,
  discoverLibraryToolSpecs,
  executeLibrarianTool,
} from "../../../../meta-harness/librarian/impl/dist/index.js";
import { createToolSpecOpenAITools } from "../../../../meta-harness/knowledge-agent/impl/dist/create-toolspec-openai-tools.js";
import { executeToolSpec } from "../impl/quartz-secret.mjs";

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
  `${organizationActor}/admin`,
  "actor://proj-quartz/agent",
];
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

const postgresCommand = requireCommand("postgres");
const initdbCommand = requireCommand("initdb");
const workRoot = await mkdtemp(join(tmpdir(), "quartz-secret-toolspec-"));
const dataRoot = join(workRoot, "data");
const port = await availablePort();
const socketRoot = join("/tmp", `qz-secret-${process.pid}-${port}`);
const connectionString = `postgresql://postgres@127.0.0.1:${port}/postgres`;
const projectConfigPath = join(workRoot, "quartz-project.json");
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
  const stderr = [];
  postgres.stderr.setEncoding("utf8");
  postgres.stderr.on("data", (chunk) => stderr.push(chunk));

  await writeProjectConfig(projectConfigPath);
  setQuartzSecretTestEnv(projectConfigPath, connectionString);
  await waitForPostgres(connectionString, () => stderr.join(""));
  await assertQuartzSecretToolSpecDiscovery();

  const storeResult = await executeToolSpec({
    operation: "store",
    label: "Acme API key",
    value: acceptanceSecret,
  });
  assert.equal(storeResult.ok, true);
  assert.equal(storeResult.operation, "create");
  assert.equal(storeResult.secret.scope, "personal");
  assert.equal(storeResult.secret.organization_id, "test-org");
  assert.equal(storeResult.secret.owner_actor, userActor);
  assert.doesNotMatch(JSON.stringify(storeResult), new RegExp(acceptanceSecret));

  process.env.META_HARNESS_CONVERSATION_LIBRARY_ROOT_PATH =
    "/libraries/organizations/test-org/users/test-user/second-conversation";

  const listResult = await executeToolSpec({ operation: "list" });
  assert.equal(listResult.ok, true);
  assert.equal(listResult.secrets.length, 1);
  assert.equal(listResult.secrets[0].label, "Acme API key");
  assert.equal(listResult.secrets[0].scope, "personal");
  assert.equal(listResult.secrets[0].use_allowed, true);
  assert.equal(listResult.secrets[0].reveal_allowed, true);
  assert.doesNotMatch(JSON.stringify(listResult), new RegExp(acceptanceSecret));

  const useResult = await executeToolSpec({
    operation: "use",
    label: "Acme API key",
  });
  assert.equal(useResult.ok, true);
  assert.equal(useResult.use_granted, true);
  assert.doesNotMatch(JSON.stringify(useResult), new RegExp(acceptanceSecret));

  const revealResult = await executeToolSpec({
    operation: "reveal",
    label: "Acme API key",
  });
  assert.equal(revealResult.ok, true);
  assert.equal(revealResult.secret_value, acceptanceSecret);
  assert.equal(revealResult.sensitivity, "secret_reveal");

  const orgSecretValue = "qz_shared_secret_67890";
  const organizationStoreResult = await executeToolSpec({
    operation: "store",
    label: "Shared API key",
    value: orgSecretValue,
    scope: "organization",
  });
  assert.equal(organizationStoreResult.ok, true);
  assert.equal(organizationStoreResult.secret.scope, "organization");
  assert.equal(organizationStoreResult.secret.owner_actor, organizationActor);
  assert.doesNotMatch(JSON.stringify(organizationStoreResult), new RegExp(orgSecretValue));

  const secondListResult = await executeToolSpec({ operation: "list" });
  assert.deepEqual(
    secondListResult.secrets.map((secret) => `${secret.scope}:${secret.label}`),
    ["personal:Acme API key", "organization:Shared API key"],
  );
  assert.doesNotMatch(JSON.stringify(secondListResult), new RegExp(orgSecretValue));

  await assert.rejects(
    () => executeToolSpec({ operation: "reveal", label: "Missing API key" }),
    /Missing Secret: Missing API key/,
  );

  inspectionStorage = createSecretTestStorage(connectionString);
  const libraryEntries = await inspectionStorage.listDirectory("/libraries");
  assert.deepEqual(
    libraryEntries.filter((entry) => entry.name.startsWith("quartz-secret-")),
    [],
    "Secret Libraries must not be stored directly under /libraries",
  );
  assert.ok(
    libraryEntries.some((entry) => entry.isDirectory && entry.name === "organizations"),
    "Secrets should live under the organization knowledge root",
  );

  const personalSecretsRoot = "/libraries/organizations/test-org/users/test-user/secrets";
  const personalSecretEntries = await inspectionStorage.listDirectory(personalSecretsRoot);
  const secretLibrary = personalSecretEntries.find((entry) =>
    entry.isDirectory && entry.name.startsWith("quartz-secret-")
  );
  assert.ok(secretLibrary, "expected one personal Secret Library under the user secrets root");
  const secretRoot = `${personalSecretsRoot}/${secretLibrary.name}`;

  const organizationSecretsRoot = "/libraries/organizations/test-org/secrets";
  const organizationSecretEntries = await inspectionStorage.listDirectory(organizationSecretsRoot);
  const organizationSecretLibrary = organizationSecretEntries.find((entry) =>
    entry.isDirectory && entry.name.startsWith("quartz-secret-")
  );
  assert.ok(
    organizationSecretLibrary,
    "expected one organization Secret Library under the organization secrets root",
  );
  const libraryToml = await inspectionStorage.readText(`${secretRoot}/LIBRARY.toml`);
  const metadataToml = await inspectionStorage.readText(`${secretRoot}/SECRET.toml`);
  const encryptedValue = await inspectionStorage.readText(`${secretRoot}/SECRET-VALUE.json`);
  const auditJsonl = await inspectionStorage.readText(`${secretRoot}/AUDIT.jsonl`);
  const organizationMetadataToml = await inspectionStorage.readText(
    `${organizationSecretsRoot}/${organizationSecretLibrary.name}/SECRET.toml`,
  );

  assert.match(libraryToml, /agent_excludes = \["SECRET-VALUE\.json"\]/);
  assert.match(encryptedValue, /"algorithm": "aes-256-gcm"/);
  assert.doesNotMatch(metadataToml, new RegExp(acceptanceSecret));
  assert.doesNotMatch(encryptedValue, new RegExp(acceptanceSecret));
  assert.doesNotMatch(auditJsonl, new RegExp(acceptanceSecret));
  assert.doesNotMatch(organizationMetadataToml, new RegExp(orgSecretValue));
  assert.match(organizationMetadataToml, /scope = "organization"/);
  assert.match(auditJsonl, /"operation":"create"/);
  assert.match(auditJsonl, /"operation":"use"/);
  assert.match(auditJsonl, /"operation":"reveal"/);

  const librarianContext = createSecretTestLibrarianContext(inspectionStorage);
  const listedFiles = await executeLibrarianTool(librarianContext, "librarian_list_files", {
    uri: `library://${secretLibrary.name}`,
    recursive: true,
  });
  assert.ok(
    listedFiles.files.every((file) => !String(file.uri).endsWith("/SECRET-VALUE.json")),
    "SECRET-VALUE.json must be excluded from ordinary Librarian file listings",
  );
  await assert.rejects(
    () => executeLibrarianTool(librarianContext, "librarian_read", {
      uri: `library://${secretLibrary.name}/SECRET-VALUE.json`,
    }),
    /excluded from agent access/,
  );

  assert.equal(firstConversationMessage.includes(acceptanceSecret), true);
  assert.equal(secondConversationMessage, "What is my Acme API key?");

  console.log(JSON.stringify({
    ok: true,
    firstConversationMessage,
    secondConversationMessage,
    secretLibrary: `library://${secretLibrary.name}`,
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

function createSecretTestStorage(connectionStringValue) {
  return createPostgresStorageFromConnectionString({
    connectionString: connectionStringValue,
    schemaName: "quartz_secret_test",
    tableName: "resources",
    autoEnsureSchema: true,
    actorUris,
    defaultReadActors: [userActor],
    defaultUpdateActors: [userActor],
  });
}

function createSecretTestLibrarianContext(storage) {
  return createLibrarianContext({
    storage,
    storageLocations: [
      {
        name: "quartz-secret-test",
        description: "Quartz Secret ToolSpec integration test storage.",
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
        discoveryMode: "resource-recursive",
        discoveryExcludes: [],
        discoverLibraries: true,
        sourceUri: "library://proj-quartz/.meta-harness.json",
        guidanceUri: "library://meta-harness/storage/STORAGE.md",
      },
    ],
    actorUri: userActor,
    actorUris,
    defaultReadActors: [userActor],
    defaultUpdateActors: [userActor],
    sessionId: "quartz-secret-toolspec-integration",
  });
}

async function assertQuartzSecretToolSpecDiscovery() {
  const storage = createLocalFileSystemStorage();
  const context = createLibrarianContext({
    storage,
    storageLocations: [
      {
        name: "project",
        description: "Quartz project knowledge and application files.",
        driverName: "filesystem",
        storage,
        capabilities: {
          readable: true,
          writable: false,
          deletable: false,
          queryable: true,
          blob: true,
        },
        libraryRootPath: join(repoRoot, "proj-quartz"),
        discoveryMode: "filesystem-root-and-direct-children",
        discoveryExcludes: [
          "app/node_modules",
          "app/node_modules/**",
          "app/vendor",
          "app/vendor/**",
          "app/.next",
          "app/.next/**",
        ],
        discoverLibraries: true,
        sourceUri: "library://proj-quartz/.meta-harness.json",
        guidanceUri: "library://meta-harness/storage/STORAGE.md",
      },
    ],
    actorUri: userActor,
    actorUris,
    sessionId: "quartz-secret-toolspec-discovery",
  });
  const toolSpecs = await discoverLibraryToolSpecs(context);
  const secretToolSpec = toolSpecs.find((toolSpec) => toolSpec.name === "quartz_secret");
  assert.ok(secretToolSpec, "quartz_secret ToolSpec should be discovered from library://proj-quartz");
  assert.equal(secretToolSpec.implementation, "impl/quartz-secret.mjs");
  assert.equal(secretToolSpec.implementationAvailable, true);
  assert.equal(secretToolSpec.implementationLoadMode, "file");
  assert.match(secretToolSpec.description, /remember, save, or store an API key/);
  assert.match(secretToolSpec.description, /what their secret is/);

  const tools = await createToolSpecOpenAITools({
    librarianContext: context,
    reservedToolNames: new Set(),
  });
  const secretTool = tools.find((tool) => tool.name === "quartz_secret");
  assert.ok(secretTool, "quartz_secret should be exposed as a generic Knowledge Agent tool");
  assert.match(secretTool.description ?? "", /remember, save, or store an API key/);
  assert.match(secretTool.description ?? "", /use reveal only after authority is checked/);
}

async function writeProjectConfig(path) {
  await writeFile(
    path,
    `${JSON.stringify({
      storage: {
        locations: [
          {
            name: "quartz-postgres",
            driverName: "postgres",
            connectionStringEnv: "QUARTZ_SECRET_TEST_POSTGRES_URL",
            schemaName: "quartz_secret_test",
            tableName: "resources",
            autoEnsureSchema: true,
            defaultForLibraryCreation: true,
          },
        ],
      },
    }, null, 2)}\n`,
  );
}

function setQuartzSecretTestEnv(configPath, connectionStringValue) {
  process.env.QUARTZ_PROJECT_CONFIG = configPath;
  process.env.QUARTZ_SECRET_TEST_POSTGRES_URL = connectionStringValue;
  process.env.QUARTZ_USER_SECRET_ENCRYPTION_KEY =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  process.env.QUARTZ_USER_SECRET_ENCRYPTION_KEY_ID = "test-v1";
  process.env.META_HARNESS_ACTIVE_ACTOR_URI = userActor;
  process.env.META_HARNESS_ACTIVE_ACTOR_URIS = actorUris.join("\n");
  process.env.META_HARNESS_CONVERSATION_LIBRARY_ROOT_PATH =
    "/libraries/organizations/test-org/users/test-user/first-conversation";
}

async function waitForPostgres(connectionStringValue, stderrText) {
  const deadline = Date.now() + 15_000;
  let lastError;
  while (Date.now() < deadline) {
    const storage = createSecretTestStorage(connectionStringValue);
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
