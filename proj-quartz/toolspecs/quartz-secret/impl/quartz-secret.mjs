// Generated file. Do not edit directly; update the ToolSpec first.
// Supports ToolSpec: quartz_secret
// Harness-Requirement: proj-quartz.secret-primitive-onboarding
// Harness-Requirement: proj-quartz.secret-scope
// Harness-Requirement: proj-quartz.secret-use-reveal-policy
// Harness-Requirement: proj-quartz.secret-encrypted-library-storage

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import {
  createPostgresStorageFromConnectionString,
} from "../../../../meta-harness/librarian/impl/dist/index.js";

const secretLibraryPrefix = "quartz-secret-";
const secretValueFile = "SECRET-VALUE.json";
const secretMetadataFile = "SECRET.toml";
const secretAuditFile = "AUDIT.jsonl";
const librariesRoot = "/libraries";
const organizationsRoot = `${librariesRoot}/organizations`;
const secretContainerName = "secrets";

export async function executeToolSpec(input) {
  const operation = requiredEnum(input.operation, "operation", [
    "store",
    "list",
    "use",
    "reveal",
  ]);
  const actorContext = activeActorContext();
  const storageConfig = quartzStorageConfig();

  if (operation === "list") {
    return withStorage(storageConfig, actorContext, actorContext.personalPolicy, async (storage) => ({
      ok: true,
      secrets: (await listSecretRecords(storage, actorContext)).map((record) =>
        publicSecretMetadata(record, actorContext)
      ),
    }));
  }

  const label = requiredString(input.label, "label");
  const scope = secretScope(input.scope);

  if (operation === "store") {
    const value = requiredSecretValue(input.value);
    const purpose = optionalString(input.purpose);
    const policy = policyForScope(scope, actorContext);
    return withStorage(storageConfig, actorContext, policy, async (storage) => {
      const now = new Date().toISOString();
      await ensureSecretScopeContainers(storageConfig, actorContext, scope);
      const root = secretRootPath(scope, label, actorContext);
      const libraryName = secretLibraryName(scope, label, actorContext);
      const existing = await readSecretMetadata(storage, root).catch((error) => {
        if (isMissingPathError(error)) {
          return null;
        }
        throw error;
      });
      if (existing && !actorAllowed(existing.update_actors, actorContext.actorUris)) {
        throw new Error(`Secret is not updateable by the active actor: ${label}`);
      }
      const metadata = {
        label,
        label_normalized: normalizeLabel(label),
        scope,
        organization_id: actorContext.organizationId,
        owner_actor: scope === "personal" ? actorContext.userActor : actorContext.organizationActor,
        purpose,
        metadata_read_actors: policy.metadataReadActors,
        use_actors: policy.useActors,
        reveal_actors: policy.revealActors,
        update_actors: policy.updateActors,
        grant_actors: policy.grantActors,
        delete_actors: policy.deleteActors,
        value_resource: secretValueFile,
        created_at: existing?.created_at ?? now,
        updated_at: now,
      };
      await storage.makeDirectory(root);
      await storage.writeText(`${root}/LIBRARY.toml`, renderLibraryToml({
        name: libraryName,
        description: `Quartz Secret metadata for ${label}.`,
        readActors: policy.metadataReadActors,
        updateActors: policy.updateActors,
      }));
      await storage.writeText(`${root}/${secretMetadataFile}`, renderSecretToml(metadata));
      await storage.writeText(
        `${root}/${secretValueFile}`,
        `${JSON.stringify(encryptSecretValue(value), null, 2)}\n`,
      );
      await appendAudit(storageConfig, actorContext, metadata, {
        operation: existing ? "rotate" : "create",
        result: "ok",
      });
      return {
        ok: true,
        operation: existing ? "rotate" : "create",
        secret: publicSecretMetadata(
          { libraryName, root, metadata },
          actorContext,
        ),
        value: "[redacted]",
      };
    });
  }

  return withStorage(storageConfig, actorContext, actorContext.personalPolicy, async (storage) => {
    const record = await findSecretRecord(storage, actorContext, { label, scope });
    if (operation === "use") {
      if (!actorAllowed(record.metadata.use_actors, actorContext.actorUris)) {
        throw new Error(`Secret exists but cannot be used by the active actor: ${label}`);
      }
      await appendAudit(storageConfig, actorContext, record.metadata, {
        operation: "use",
        result: "ok",
      });
      return {
        ok: true,
        operation: "use",
        secret: publicSecretMetadata(record, actorContext),
        use_granted: true,
      };
    }

    if (!actorAllowed(record.metadata.reveal_actors, actorContext.actorUris)) {
      throw new Error(`Secret exists but cannot be revealed by the active actor: ${label}`);
    }
    const encrypted = JSON.parse(await storage.readText(`${record.root}/${record.metadata.value_resource}`));
    const secretValue = decryptSecretValue(encrypted);
    await appendAudit(storageConfig, actorContext, record.metadata, {
      operation: "reveal",
      result: "ok",
    });
    return {
      ok: true,
      operation: "reveal",
      secret: publicSecretMetadata(record, actorContext),
      secret_value: secretValue,
      sensitivity: "secret_reveal",
    };
  });
}

function activeActorContext() {
  const actorUri = requiredEnv("META_HARNESS_ACTIVE_ACTOR_URI");
  const actorUris = actorList(requiredEnv("META_HARNESS_ACTIVE_ACTOR_URIS"));
  const userActor = actorUris.find((actor) => /^actor:\/\/proj-quartz\/user\/[^/]+$/.test(actor));
  if (!userActor) {
    throw new Error("Quartz Secret tools require an active user actor.");
  }
  const organizationActor = actorUris.find((actor) =>
    /^actor:\/\/proj-quartz\/organization\/[^/]+$/.test(actor)
  );
  if (!organizationActor) {
    throw new Error("Quartz Secret tools require an active organization tenant.");
  }
  const organizationId = organizationActor.split("/").at(-1);
  const userId = userActor.split("/").at(-1);
  const memberActor = `${organizationActor}/member`;
  const adminActor = `${organizationActor}/admin`;
  return {
    actorUri,
    actorUris,
    userActor,
    userId,
    organizationActor,
    organizationId,
    memberActor,
    adminActor,
    personalPolicy: {
      metadataReadActors: [userActor],
      useActors: [userActor],
      revealActors: [userActor],
      updateActors: [userActor],
      grantActors: [userActor],
      deleteActors: [userActor],
      auditUpdateActors: [userActor],
    },
  };
}

function policyForScope(scope, actorContext) {
  if (scope === "personal") {
    return actorContext.personalPolicy;
  }
  if (!actorContext.actorUris.includes(actorContext.adminActor)) {
    throw new Error("Organization Secret creation requires organization admin authority.");
  }
  return {
    metadataReadActors: [actorContext.organizationActor],
    useActors: [actorContext.memberActor],
    revealActors: [actorContext.adminActor],
    updateActors: [actorContext.adminActor],
    grantActors: [actorContext.adminActor],
    deleteActors: [actorContext.adminActor],
    auditUpdateActors: [
      actorContext.memberActor,
      actorContext.adminActor,
    ],
  };
}

async function withStorage(storageConfig, actorContext, policy, run) {
  const storage = createPostgresStorageFromConnectionString({
    connectionString: storageConfig.connectionString,
    schemaName: storageConfig.schemaName,
    tableName: storageConfig.tableName,
    autoEnsureSchema: storageConfig.autoEnsureSchema,
    actorUris: actorContext.actorUris,
    defaultReadActors: policy.metadataReadActors,
    defaultUpdateActors: policy.updateActors,
  });
  try {
    return await run(storage);
  } finally {
    await storage.close?.();
  }
}

async function appendAudit(storageConfig, actorContext, metadata, event) {
  const policy = {
    metadataReadActors: metadata.metadata_read_actors,
    updateActors: metadata.audit_update_actors ?? uniqueActors([
      ...metadata.update_actors,
      ...metadata.use_actors,
      ...metadata.reveal_actors,
    ]),
  };
  await withStorage(storageConfig, actorContext, policy, async (storage) => {
    const root = secretRootPath(metadata.scope, metadata.label, actorContext);
    const auditPath = `${root}/${secretAuditFile}`;
    const previous = await storage.exists(auditPath) ? await storage.readText(auditPath) : "";
    const record = {
      operation: event.operation,
      result: event.result,
      actor_uri: actorContext.actorUri,
      actor_uris: actorContext.actorUris,
      label: metadata.label,
      scope: metadata.scope,
      organization_id: metadata.organization_id,
      recorded_at: new Date().toISOString(),
    };
    await storage.writeText(auditPath, `${previous}${JSON.stringify(record)}\n`);
  });
}

async function listSecretRecords(storage, actorContext) {
  const records = [];
  for (const root of secretScopeListRoots(actorContext)) {
    if (!(await storage.exists(root))) {
      continue;
    }
    const entries = await storage.listDirectory(root);
    for (const entry of entries) {
      if (!entry.isDirectory || !entry.name.startsWith(secretLibraryPrefix)) {
        continue;
      }
      const secretRoot = `${root}/${entry.name}`;
      const metadata = await readSecretMetadata(storage, secretRoot).catch((error) => {
        if (isMissingPathError(error)) {
          return null;
        }
        throw error;
      });
      if (!metadata || !actorAllowed(metadata.metadata_read_actors, actorContext.actorUris)) {
        continue;
      }
      records.push({ libraryName: entry.name, root: secretRoot, metadata });
    }
  }
  return records.sort((left, right) =>
    left.metadata.label.localeCompare(right.metadata.label) ||
    left.metadata.scope.localeCompare(right.metadata.scope)
  );
}

async function findSecretRecord(storage, actorContext, input) {
  const labelNormalized = normalizeLabel(input.label);
  const matches = (await listSecretRecords(storage, actorContext)).filter((record) =>
    record.metadata.label_normalized === labelNormalized &&
    (!input.scope || record.metadata.scope === input.scope)
  );
  if (matches.length === 0) {
    throw new Error(`Missing Secret: ${input.label}`);
  }
  if (matches.length > 1) {
    throw new Error(`Multiple Secrets match ${input.label}; specify personal or organization scope.`);
  }
  return matches[0];
}

async function readSecretMetadata(storage, root) {
  return parseSecretToml(await storage.readText(`${root}/${secretMetadataFile}`));
}

function publicSecretMetadata(record, actorContext) {
  const metadata = record.metadata;
  return {
    label: metadata.label,
    scope: metadata.scope,
    organization_id: metadata.organization_id,
    owner_actor: metadata.owner_actor,
    purpose: metadata.purpose || undefined,
    library_uri: `library://${record.libraryName}`,
    use_allowed: actorAllowed(metadata.use_actors, actorContext.actorUris),
    reveal_allowed: actorAllowed(metadata.reveal_actors, actorContext.actorUris),
    updated_at: metadata.updated_at,
  };
}

function renderLibraryToml(input) {
  return [
    "# This is a Harness primitive.",
    "# See also: library://meta-harness",
    "",
    `name = ${tomlString(input.name)}`,
    "isSystemLibrary = false",
    `description = ${tomlString(input.description)}`,
    `read_actors = ${tomlArray(input.readActors)}`,
    `update_actors = ${tomlArray(input.updateActors)}`,
    `agent_excludes = ${tomlArray([secretValueFile])}`,
    "",
  ].join("\n");
}

function renderSecretToml(metadata) {
  return [
    "# This is a Harness primitive.",
    "# See also: library://meta-harness",
    "",
    `label = ${tomlString(metadata.label)}`,
    `label_normalized = ${tomlString(metadata.label_normalized)}`,
    `scope = ${tomlString(metadata.scope)}`,
    `organization_id = ${tomlString(metadata.organization_id)}`,
    `owner_actor = ${tomlString(metadata.owner_actor)}`,
    `purpose = ${tomlString(metadata.purpose ?? "")}`,
    `metadata_read_actors = ${tomlArray(metadata.metadata_read_actors)}`,
    `use_actors = ${tomlArray(metadata.use_actors)}`,
    `reveal_actors = ${tomlArray(metadata.reveal_actors)}`,
    `update_actors = ${tomlArray(metadata.update_actors)}`,
    `grant_actors = ${tomlArray(metadata.grant_actors)}`,
    `delete_actors = ${tomlArray(metadata.delete_actors)}`,
    `audit_update_actors = ${tomlArray(metadata.auditUpdateActors ?? metadata.audit_update_actors ?? uniqueActors([
      ...metadata.update_actors,
      ...metadata.use_actors,
      ...metadata.reveal_actors,
    ]))}`,
    `value_resource = ${tomlString(metadata.value_resource)}`,
    `created_at = ${tomlString(metadata.created_at)}`,
    `updated_at = ${tomlString(metadata.updated_at)}`,
    "",
  ].join("\n");
}

function parseSecretToml(content) {
  return {
    label: tomlStringField(content, "label"),
    label_normalized: tomlStringField(content, "label_normalized"),
    scope: tomlStringField(content, "scope"),
    organization_id: tomlStringField(content, "organization_id"),
    owner_actor: tomlStringField(content, "owner_actor"),
    purpose: tomlStringField(content, "purpose"),
    metadata_read_actors: tomlArrayField(content, "metadata_read_actors"),
    use_actors: tomlArrayField(content, "use_actors"),
    reveal_actors: tomlArrayField(content, "reveal_actors"),
    update_actors: tomlArrayField(content, "update_actors"),
    grant_actors: tomlArrayField(content, "grant_actors"),
    delete_actors: tomlArrayField(content, "delete_actors"),
    audit_update_actors: tomlArrayField(content, "audit_update_actors"),
    value_resource: tomlStringField(content, "value_resource"),
    created_at: tomlStringField(content, "created_at"),
    updated_at: tomlStringField(content, "updated_at"),
  };
}

function encryptSecretValue(value) {
  const key = encryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return {
    version: 1,
    algorithm: "aes-256-gcm",
    key_id: process.env.QUARTZ_USER_SECRET_ENCRYPTION_KEY_ID?.trim() || "default",
    iv: iv.toString("base64url"),
    ciphertext: ciphertext.toString("base64url"),
    auth_tag: cipher.getAuthTag().toString("base64url"),
  };
}

function decryptSecretValue(record) {
  if (
    record?.version !== 1 ||
    record?.algorithm !== "aes-256-gcm" ||
    typeof record.iv !== "string" ||
    typeof record.ciphertext !== "string" ||
    typeof record.auth_tag !== "string"
  ) {
    throw new Error("Secret value resource is malformed.");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(record.iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(record.auth_tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(record.ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function encryptionKey() {
  const raw = requiredEnv("QUARTZ_USER_SECRET_ENCRYPTION_KEY").trim();
  const candidates = [];
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    candidates.push(Buffer.from(raw, "hex"));
  }
  candidates.push(Buffer.from(raw, "base64url"));
  candidates.push(Buffer.from(raw, "base64"));
  const key = candidates.find((candidate) => candidate.length === 32);
  if (!key) {
    throw new Error("QUARTZ_USER_SECRET_ENCRYPTION_KEY must be a 32-byte base64url, base64, or hex value.");
  }
  return key;
}

function quartzStorageConfig() {
  const configPath = projectConfigPath();
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  const location = config.storage?.locations?.find((candidate) =>
    candidate?.name === "quartz-postgres" ||
    candidate?.defaultForLibraryCreation === true
  );
  if (!location || location.driverName !== "postgres") {
    throw new Error("Quartz Secret storage requires the configured quartz-postgres storage location.");
  }
  const envName = location.connectionStringEnv || "QUARTZ_POSTGRES_URL";
  return {
    connectionString: requiredEnv(envName),
    schemaName: location.schemaName,
    tableName: location.tableName,
    autoEnsureSchema: location.autoEnsureSchema,
  };
}

function projectConfigPath() {
  const configured = process.env.QUARTZ_PROJECT_CONFIG || "proj-quartz/.meta-harness.json";
  return isAbsolute(configured) ? configured : resolve(process.cwd(), configured);
}

async function ensureSecretScopeContainers(storageConfig, actorContext, scope) {
  await withStorage(storageConfig, actorContext, organizationContainerPolicy(actorContext), async (storage) => {
    await storage.makeDirectory(organizationKnowledgeRoot(actorContext));
    if (scope === "personal") {
      await storage.makeDirectory(`${organizationKnowledgeRoot(actorContext)}/users`);
    }
  });
}

function organizationContainerPolicy(actorContext) {
  return {
    metadataReadActors: [actorContext.organizationActor],
    updateActors: [actorContext.organizationActor],
  };
}

function secretLibraryName(scope, label, actorContext) {
  const owner = scope === "personal" ? actorContext.userActor : actorContext.organizationActor;
  const source = [
    "quartz-secret",
    scope,
    actorContext.organizationId,
    owner,
    normalizeLabel(label),
  ].join("\0");
  return `${secretLibraryPrefix}${createHash("sha256").update(source).digest("hex").slice(0, 24)}`;
}

function secretRootPath(scope, label, actorContext) {
  return `${secretScopeContainerRoot(scope, actorContext)}/${secretLibraryName(scope, label, actorContext)}`;
}

function secretScopeListRoots(actorContext) {
  return [
    secretScopeContainerRoot("personal", actorContext),
    secretScopeContainerRoot("organization", actorContext),
  ];
}

function secretScopeContainerRoot(scope, actorContext) {
  if (scope === "personal") {
    return `${organizationKnowledgeRoot(actorContext)}/users/${safeResourceSegment(actorContext.userId)}/${secretContainerName}`;
  }
  return `${organizationKnowledgeRoot(actorContext)}/${secretContainerName}`;
}

function organizationKnowledgeRoot(actorContext) {
  return `${organizationsRoot}/${safeResourceSegment(actorContext.organizationId)}`;
}

function secretScope(value) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return "personal";
  }
  return requiredEnum(value, "scope", ["personal", "organization"]);
}

function normalizeLabel(value) {
  return String(value).replace(/\s+/g, " ").trim().toLowerCase();
}

function safeResourceSegment(value) {
  const segment = String(value ?? "").trim().replace(/[^A-Za-z0-9._-]/g, "_");
  if (!segment) {
    throw new Error("Quartz Secret resource path segment must contain URL-safe characters.");
  }
  return segment;
}

function actorAllowed(patterns, actors) {
  return actors.some((actor) => patterns.some((pattern) => wildcardPatternMatches(pattern, actor)));
}

function wildcardPatternMatches(pattern, value) {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped.replace(/\*/g, ".*")}$`).test(value);
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value?.trim()) {
    throw new Error(`${name} is required for Quartz Secret tools.`);
  }
  return value;
}

function actorList(value) {
  return uniqueActors(value.split(/[\n,]/g).map((actor) => actor.trim()).filter(Boolean));
}

function uniqueActors(values) {
  return values.filter((value, index, all) => all.indexOf(value) === index);
}

function requiredString(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Quartz Secret ${label} is required.`);
  }
  return value.trim();
}

function requiredSecretValue(value) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("Quartz Secret value is required.");
  }
  return value;
}

function optionalString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function requiredEnum(value, label, allowed) {
  const stringValue = typeof value === "string" ? value.trim() : "";
  if (!allowed.includes(stringValue)) {
    throw new Error(`Quartz Secret ${label} must be one of ${allowed.join(", ")}.`);
  }
  return stringValue;
}

function tomlString(value) {
  return JSON.stringify(value);
}

function tomlArray(values) {
  return JSON.stringify(values);
}

function tomlStringField(content, field) {
  const value = tomlField(content, field);
  return typeof value === "string" ? value : "";
}

function tomlArrayField(content, field) {
  const value = tomlField(content, field);
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}

function tomlField(content, field) {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = content.match(new RegExp(`^${escaped}\\s*=\\s*(.+)$`, "m"));
  if (!match) {
    return undefined;
  }
  return JSON.parse(match[1].trim());
}

function isMissingPathError(error) {
  return error instanceof Error && /does not exist|ENOENT|not found/i.test(error.message);
}
