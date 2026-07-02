// Harness-Requirement: librarian.library-editor-librarian-boundary
// Harness-Requirement: librarian.context-filters
// Harness-Requirement: librarian.actor-context-filters
// Harness-Requirement: librarian.change-set-operations
// Harness-Requirement: librarian.driver-change-set-application

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  loadQuartzProjectEnv,
  quartzProjectRootPath,
  quartzResourceActorContext,
  repoRootPath,
  sessionFromToken,
  withQuartzAuthDb,
  type QuartzAuthSession,
  type QuartzResourceActorContext,
} from "./quartz-auth-db";
import { readQuartzSessionCookie } from "./quartz-auth-cookie";

type MetaHarnessStorageCapability =
  | "read"
  | "write"
  | "delete"
  | "query"
  | "blob";

type MetaHarnessStorageGrant = {
  actors?: string[];
  capabilities?: MetaHarnessStorageCapability[];
};

type MetaHarnessStorageLocation = {
  name?: string;
  description?: string;
  driverName?: string;
  grants?: MetaHarnessStorageGrant[];
  libraryRootPath?: string;
  discoveryMode?: string;
  discoveryExcludes?: string[];
  discoverLibraries?: boolean;
  defaultForLibraryCreation?: boolean;
  createdLibraryReadActors?: string[];
  createdLibraryUpdateActors?: string[];
  enabledWhenEnv?: string;
  connectionStringEnv?: string;
  schemaName?: string;
  tableName?: string;
  autoEnsureSchema?: boolean;
  sourceUri?: string;
  guidanceUri?: string;
};

type MetaHarnessConfig = {
  project?: {
    localRoot?: string;
  };
  storage?: {
    locations?: MetaHarnessStorageLocation[];
  };
};

type StorageDriverCapabilities = {
  readable: boolean;
  writable: boolean;
  deletable: boolean;
  queryable: boolean;
  blob: boolean;
};

type LibrarianStorage = {
  readText(path: string): Promise<string>;
  writeText(path: string, content: string): Promise<void>;
  deletePath(path: string): Promise<void>;
  makeDirectory(path: string): Promise<void>;
  listDirectory(path: string): Promise<{ name: string; isDirectory: boolean }[]>;
  exists(path: string): Promise<boolean>;
  close?: () => Promise<void>;
};

type StorageDiscoveryMode =
  | "filesystem-root-and-direct-children"
  | "filesystem-recursive"
  | "resource-root-and-direct-children"
  | "resource-recursive";

type StorageLocation = {
  name: string;
  description: string;
  driverName: string;
  storage: LibrarianStorage;
  capabilities: StorageDriverCapabilities;
  libraryRootPath: string;
  discoveryMode: StorageDiscoveryMode;
  discoveryExcludes: string[];
  discoverLibraries?: boolean;
  defaultForLibraryCreation?: boolean;
  createdLibraryReadActors?: string[];
  createdLibraryUpdateActors?: string[];
  sourceUri?: string;
  guidanceUri?: string;
};

type LibrarianContext = {
  storage: LibrarianStorage;
  storageLocations: StorageLocation[];
  actorUri: string;
  actorUris: string[];
  sessionId: string;
  contextFilters: {
    actorUris: string[];
  };
  toolCallEvents: unknown[];
};

type LibrarianModule = {
  createLibrarianContext(input: {
    storage: LibrarianStorage;
    storageLocations: StorageLocation[];
    actorUri: string;
    actorUris: string[];
    sessionId: string;
    contextFilters?: {
      actorUris?: string[];
    };
  }): LibrarianContext;
  createLocalFileSystemStorage(): LibrarianStorage;
  createPostgresStorageFromConnectionString(input: {
    connectionString: string;
    schemaName?: string;
    tableName?: string;
    autoEnsureSchema?: boolean;
    actorUris?: string[];
    defaultReadActors?: string[];
    defaultUpdateActors?: string[];
  }): LibrarianStorage;
  executeLibrarianTool(
    context: LibrarianContext,
    toolName: string,
    input: Record<string, unknown>,
  ): Promise<unknown>;
};

export async function requestQuartzSession(): Promise<QuartzAuthSession> {
  const token = await readQuartzSessionCookie();
  const session = await withQuartzAuthDb((client) => sessionFromToken(client, token));
  if (!session) {
    throw new Error("Sign-in is required.");
  }
  return session;
}

export async function executeQuartzLibrarianTool(
  session: QuartzAuthSession,
  toolName: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  return withQuartzLibrarianContext(session, (context, librarian) =>
    librarian.executeLibrarianTool(context, toolName, input)
  );
}

export async function withQuartzLibrarianContext<T>(
  session: QuartzAuthSession,
  fn: (context: LibrarianContext, librarian: LibrarianModule) => Promise<T>,
): Promise<T> {
  loadQuartzProjectEnv();
  const librarian = await loadLibrarianModule();
  const repoRoot = repoRootPath();
  const configPath = quartzProjectConfigPath();
  const config = loadMetaHarnessConfig(repoRoot, configPath);
  const actorContext = quartzResourceActorContext(session);
  const filesystemStorage = librarian.createLocalFileSystemStorage();
  const storageLocations = materializeStorageLocations({
    config,
    configPath,
    repoRoot,
    actorContext,
    filesystemStorage,
    librarian,
  });
  const context = librarian.createLibrarianContext({
    storage: filesystemStorage,
    storageLocations,
    actorUri: actorContext.actorUri,
    actorUris: actorContext.actorUris,
    sessionId: session.tokenHash,
    contextFilters: {
      actorUris: session.activeOrganization?.actorUri
        ? [session.activeOrganization.actorUri]
        : [],
    },
  });

  try {
    return await fn(context, librarian);
  } finally {
    await closeStorageLocations(storageLocations);
  }
}

async function loadLibrarianModule(): Promise<LibrarianModule> {
  const moduleUrl = pathToFileURL(
    path.resolve(repoRootPath(), "meta-harness/librarian/impl/dist/index.js"),
  ).href;
  return import(/* webpackIgnore: true */ moduleUrl) as Promise<LibrarianModule>;
}

function quartzProjectConfigPath(): string {
  return process.env.QUARTZ_PROJECT_CONFIG ?? "proj-quartz/.meta-harness.json";
}

function loadMetaHarnessConfig(repoRoot: string, configPath: string): MetaHarnessConfig {
  const resolvedPath = path.isAbsolute(configPath)
    ? path.resolve(configPath)
    : path.resolve(repoRoot, configPath);
  return JSON.parse(readFileSync(resolvedPath, "utf8")) as MetaHarnessConfig;
}

function materializeStorageLocations(input: {
  config: MetaHarnessConfig;
  configPath: string;
  repoRoot: string;
  actorContext: QuartzResourceActorContext;
  filesystemStorage: LibrarianStorage;
  librarian: LibrarianModule;
}): StorageLocation[] {
  const definitions = input.config.storage?.locations;
  if (!Array.isArray(definitions)) {
    throw new Error(`${input.configPath}: storage.locations must be an array`);
  }
  const localRoot = resolveLocalRoot(
    input.repoRoot,
    requiredProjectLocalRoot(input.config),
  );
  const tmpStorageLibrariesRoot = path.join(
    localRoot,
    "knowledge-agent",
    "tmp-local-storage",
    "libraries",
  );
  const values = {
    repoRootPath: input.repoRoot,
    projectRootPath: quartzProjectRootPath(),
    localRoot,
    tmpStorageLibrariesRoot,
  };

  return definitions.flatMap((definition) => {
    const enabledWhenEnv = optionalString(definition, "enabledWhenEnv");
    if (enabledWhenEnv && !process.env[enabledWhenEnv]) {
      return [];
    }
    return [materializeStorageLocation(
      definition,
      values,
      input.actorContext,
      input.filesystemStorage,
      input.librarian,
    )];
  });
}

function materializeStorageLocation(
  definition: MetaHarnessStorageLocation,
  values: Record<string, string>,
  actorContext: QuartzResourceActorContext,
  filesystemStorage: LibrarianStorage,
  librarian: LibrarianModule,
): StorageLocation {
  const driverName = requiredString(definition, "driverName");
  return {
    name: requiredString(definition, "name"),
    description: requiredString(definition, "description"),
    driverName,
    storage: materializeStorageDriver(
      definition,
      driverName,
      actorContext,
      filesystemStorage,
      librarian,
    ),
    capabilities: computeGrantedCapabilities(requiredGrants(definition), actorContext.actorUris),
    libraryRootPath: resolveToken(requiredString(definition, "libraryRootPath"), values),
    discoveryMode: requiredDiscoveryMode(definition),
    discoveryExcludes: optionalStringArray(definition, "discoveryExcludes"),
    discoverLibraries: requiredBoolean(definition, "discoverLibraries"),
    defaultForLibraryCreation: optionalBoolean(definition, "defaultForLibraryCreation"),
    createdLibraryReadActors: createdLibraryActors(
      optionalActorArray(definition, "createdLibraryReadActors"),
      actorContext.defaultReadActors,
    ),
    createdLibraryUpdateActors: createdLibraryActors(
      optionalActorArray(definition, "createdLibraryUpdateActors"),
      actorContext.defaultUpdateActors,
    ),
    sourceUri: optionalString(definition, "sourceUri"),
    guidanceUri: optionalString(definition, "guidanceUri"),
  };
}

function materializeStorageDriver(
  definition: MetaHarnessStorageLocation,
  driverName: string,
  actorContext: QuartzResourceActorContext,
  filesystemStorage: LibrarianStorage,
  librarian: LibrarianModule,
): LibrarianStorage {
  if (driverName === "filesystem") {
    return filesystemStorage;
  }
  if (driverName === "postgres") {
    const envName = optionalString(definition, "connectionStringEnv") ??
      "META_HARNESS_POSTGRES_URL";
    const connectionString = process.env[envName];
    if (!connectionString) {
      throw new Error(`Postgres storage location requires environment variable: ${envName}`);
    }
    return librarian.createPostgresStorageFromConnectionString({
      connectionString,
      schemaName: optionalString(definition, "schemaName"),
      tableName: optionalString(definition, "tableName"),
      autoEnsureSchema: optionalBoolean(definition, "autoEnsureSchema"),
      actorUris: actorContext.actorUris,
      defaultReadActors: actorContext.defaultReadActors,
      defaultUpdateActors: actorContext.defaultUpdateActors,
    });
  }
  throw new Error(`Unsupported storage driver: ${driverName}`);
}

async function closeStorageLocations(storageLocations: StorageLocation[]): Promise<void> {
  const storages = storageLocations
    .map((location) => location.storage)
    .filter((storage, index, all) => all.indexOf(storage) === index);
  await Promise.all(storages.map(async (storage) => {
    await storage.close?.();
  }));
}

function requiredProjectLocalRoot(config: MetaHarnessConfig): string {
  const localRoot = config.project?.localRoot;
  if (typeof localRoot !== "string" || !localRoot.trim()) {
    throw new Error(".meta-harness.json project.localRoot is required.");
  }
  return localRoot;
}

function resolveLocalRoot(repoRoot: string, input: string): string {
  if (input === "~") {
    return homedir();
  }
  if (input.startsWith("~/")) {
    return path.resolve(homedir(), input.slice(2));
  }
  if (path.isAbsolute(input)) {
    return path.resolve(input);
  }
  return path.resolve(repoRoot, input);
}

function resolveToken(value: string, values: Record<string, string>): string {
  return value.replace(/\{\{([A-Za-z0-9_]+)\}\}/g, (_, key: string) => {
    const replacement = values[key];
    if (replacement === undefined) {
      throw new Error(`Unknown storage location token: ${key}`);
    }
    return replacement;
  });
}

function requiredString(definition: MetaHarnessStorageLocation, key: string): string {
  const value = definition[key as keyof MetaHarnessStorageLocation];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Storage location definition is missing string field: ${key}`);
  }
  return value;
}

function optionalString(
  definition: MetaHarnessStorageLocation,
  key: string,
): string | undefined {
  const value = definition[key as keyof MetaHarnessStorageLocation];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Storage location definition has invalid string field: ${key}`);
  }
  return value;
}

function optionalStringArray(
  definition: MetaHarnessStorageLocation,
  key: string,
): string[] {
  const value = definition[key as keyof MetaHarnessStorageLocation];
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`Storage location definition has invalid string array field: ${key}`);
  }
  return value as string[];
}

function optionalActorArray(
  definition: MetaHarnessStorageLocation,
  key: string,
): string[] | undefined {
  const value = definition[key as keyof MetaHarnessStorageLocation];
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.startsWith("actor://"))) {
    throw new Error(`Storage location definition has invalid actor array field: ${key}`);
  }
  return value as string[];
}

function createdLibraryActors(
  configuredActors: string[] | undefined,
  contextActors: string[],
): string[] | undefined {
  return contextActors.length > 0 ? contextActors : configuredActors;
}

function requiredDiscoveryMode(
  definition: MetaHarnessStorageLocation,
): StorageDiscoveryMode {
  const value = requiredString(definition, "discoveryMode");
  if (
    value !== "filesystem-root-and-direct-children" &&
    value !== "filesystem-recursive" &&
    value !== "resource-root-and-direct-children" &&
    value !== "resource-recursive"
  ) {
    throw new Error(`Storage location definition has invalid discovery mode: ${value}`);
  }
  return value;
}

function optionalBoolean(
  definition: MetaHarnessStorageLocation,
  key: string,
): boolean | undefined {
  const value = definition[key as keyof MetaHarnessStorageLocation];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "boolean") {
    throw new Error(`Storage location definition has invalid boolean field: ${key}`);
  }
  return value;
}

function requiredBoolean(definition: MetaHarnessStorageLocation, key: string): boolean {
  const value = definition[key as keyof MetaHarnessStorageLocation];
  if (typeof value !== "boolean") {
    throw new Error(`Storage location definition is missing boolean field: ${key}`);
  }
  return value;
}

function requiredGrants(definition: MetaHarnessStorageLocation): MetaHarnessStorageGrant[] {
  const grants = definition.grants;
  if (!Array.isArray(grants)) {
    throw new Error("Storage location definition is missing grants array.");
  }
  return grants;
}

function computeGrantedCapabilities(
  grants: MetaHarnessStorageGrant[],
  actorUris: string[],
): StorageDriverCapabilities {
  const granted = new Set<MetaHarnessStorageCapability>();
  for (const grant of grants) {
    const actors = requiredGrantActors(grant);
    const capabilities = requiredGrantCapabilities(grant);
    if (!actorUris.some((actorUri) => matchesAnyPattern(actors, actorUri))) {
      continue;
    }
    for (const capability of capabilities) {
      granted.add(capability);
    }
  }
  return {
    readable: granted.has("read"),
    writable: granted.has("write"),
    deletable: granted.has("delete"),
    queryable: granted.has("query"),
    blob: granted.has("blob"),
  };
}

function requiredGrantActors(grant: MetaHarnessStorageGrant): string[] {
  const actors = grant.actors;
  if (!Array.isArray(actors) || actors.some((item) => typeof item !== "string" || !item.startsWith("actor://"))) {
    throw new Error("Storage grant has invalid actors array.");
  }
  return actors;
}

function requiredGrantCapabilities(grant: MetaHarnessStorageGrant): MetaHarnessStorageCapability[] {
  const capabilities = grant.capabilities;
  if (!Array.isArray(capabilities) || capabilities.some((item) => !isStorageCapability(item))) {
    throw new Error("Storage grant has invalid capabilities array.");
  }
  return capabilities;
}

function isStorageCapability(value: unknown): value is MetaHarnessStorageCapability {
  return (
    value === "read" ||
    value === "write" ||
    value === "delete" ||
    value === "query" ||
    value === "blob"
  );
}

function matchesAnyPattern(patterns: string[], value: string): boolean {
  return patterns.some((pattern) => wildcardPatternMatches(pattern, value));
}

function wildcardPatternMatches(pattern: string, value: string): boolean {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped.replace(/\*/g, ".*")}$`).test(value);
}
