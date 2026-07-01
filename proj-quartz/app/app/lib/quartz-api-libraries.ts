// Harness-Requirement: proj-quartz.api.library-ingest
// Harness-Requirement: proj-quartz.api.production-library-listing
// Harness-Requirement: proj-quartz.api.key-actor-scope
// Harness-Requirement: proj-quartz.api.project-storage

import { posix } from "node:path";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  quartzProjectRootPath,
  repoRootPath,
  type QuartzApiActorContext,
} from "./quartz-auth-db";

type LibrarianStorage = {
  readText(path: string): Promise<string>;
  writeText(path: string, content: string): Promise<void>;
  deletePath(path: string): Promise<void>;
  makeDirectory(path: string): Promise<void>;
  listDirectory(path: string): Promise<{ name: string; isDirectory: boolean }[]>;
  exists(path: string): Promise<boolean>;
  close?(): Promise<void>;
};

type StorageLocation = {
  name: string;
  description: string;
  driverName: string;
  storage: LibrarianStorage;
  capabilities: {
    readable: boolean;
    writable: boolean;
    deletable: boolean;
    queryable: boolean;
    blob: boolean;
  };
  libraryRootPath: string;
  discoveryMode: string;
  discoveryExcludes: string[];
  discoverLibraries?: boolean;
  defaultForLibraryCreation?: boolean;
};

type LibrarianContext = {
  storage: LibrarianStorage;
  storageLocations: StorageLocation[];
  actorUri: string;
  actorUris: string[];
  sessionId: string;
  toolCallEvents: unknown[];
};

type LibrarianModule = {
  createLocalFileSystemStorage(): LibrarianStorage;
  createLibrarianContext(input: {
    storage: LibrarianStorage;
    storageLocations?: StorageLocation[];
    actorUri: string;
    actorUris?: string[];
    sessionId: string;
  }): LibrarianContext;
  listLibraries(context: LibrarianContext): Promise<Record<string, unknown>>;
};

type KnowledgeAgentStorageModule = {
  loadLocalStorageLocations(input: {
    repoRootPath: string;
    projectConfigPath: string;
    runtime: {
      localRoot: string;
      conversationsLibrary: string;
      memoryLibrary: string;
      memoryCurator: { enabled: boolean };
      conversationRoot: string;
      sessionFile: string;
      tmpStorageLibrariesRoot: string;
      sandboxWorkspace: string;
      runtimeStorage: LibrarianStorage;
    };
    storage: LibrarianStorage;
    actorUris: string[];
    defaultReadActors?: string[];
    defaultUpdateActors?: string[];
  }): StorageLocation[];
};

export type QuartzLibraryIngestFile = {
  path: string;
  content: string;
};

export type QuartzLibraryIngestInput = {
  name: string;
  description: string;
  files: QuartzLibraryIngestFile[];
};

const libraryNamePattern = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

export async function listQuartzLibraries(
  actorContext: QuartzApiActorContext,
): Promise<Record<string, unknown>> {
  return withQuartzApiLibrarianContext(actorContext, async ({ context, librarian }) =>
    librarian.listLibraries(context)
  );
}

export async function ingestQuartzLibrary(
  actorContext: QuartzApiActorContext,
  input: QuartzLibraryIngestInput,
): Promise<Record<string, unknown>> {
  const name = validateLibraryName(input.name);
  const description = requiredDescription(input.description);
  const files = validateIngestFiles(input.files);
  return withQuartzApiLibrarianContext(actorContext, async ({ context }) => {
    const location = defaultLibraryCreationLocation(context);
    const libraryRoot = posix.join(location.libraryRootPath, name);
    const manifestPath = posix.join(libraryRoot, "LIBRARY.toml");
    const exists = await location.storage.exists(manifestPath);

    if (exists) {
      const listed = await listLibraryByName(context, name);
      if (listed && listed.writable !== true) {
        throw new Error(`Library is not writable by API key actor: library://${name}`);
      }
    } else {
      await location.storage.makeDirectory(libraryRoot);
    }

    await location.storage.writeText(
      manifestPath,
      renderLibraryToml(name, description, actorContext.actorUri),
    );
    for (const file of files) {
      const resourcePath = posix.join(libraryRoot, file.path);
      await location.storage.makeDirectory(posix.dirname(resourcePath));
      await location.storage.writeText(resourcePath, file.content);
    }

    const library = await listLibraryByName(context, name);
    if (!library) {
      throw new Error(`Ingested Library did not resolve: library://${name}`);
    }
    return {
      library,
      filesWritten: files.length,
    };
  });
}

async function withQuartzApiLibrarianContext<T>(
  actorContext: QuartzApiActorContext,
  run: (input: {
    context: LibrarianContext;
    librarian: LibrarianModule;
  }) => Promise<T>,
): Promise<T> {
  const librarian = await loadLibrarianModule();
  const storageModule = await loadKnowledgeAgentStorageModule();
  const storage = librarian.createLocalFileSystemStorage();
  const context = librarian.createLibrarianContext({
    storage,
    storageLocations: storageModule.loadLocalStorageLocations({
      repoRootPath: repoRootPath(),
      projectConfigPath: projectConfigPath(),
      runtime: {
        localRoot: path.join(quartzProjectRootPath(), ".runtime"),
        conversationsLibrary: "knowledge-agent-conversations",
        memoryLibrary: "memory",
        memoryCurator: { enabled: false },
        conversationRoot: "/",
        sessionFile: "",
        tmpStorageLibrariesRoot: "/tmp/quartz-api-libraries",
        sandboxWorkspace: "/tmp/quartz-api-sandbox",
        runtimeStorage: storage,
      },
      storage,
      actorUris: actorContext.actorUris,
      defaultReadActors: actorContext.defaultReadActors,
      defaultUpdateActors: actorContext.defaultUpdateActors,
    }),
    actorUri: actorContext.actorUri,
    actorUris: actorContext.actorUris,
    sessionId: `quartz-api-${Date.now()}`,
  });

  try {
    return await run({ context, librarian });
  } finally {
    await closeStorageLocations(context.storageLocations);
  }
}

async function listLibraryByName(
  context: LibrarianContext,
  name: string,
): Promise<Record<string, unknown> | null> {
  const librarian = await loadLibrarianModule();
  const result = await librarian.listLibraries(context);
  const libraries = Array.isArray(result.libraries) ? result.libraries : [];
  return libraries.find((library) =>
    library &&
    typeof library === "object" &&
    !Array.isArray(library) &&
    (library as Record<string, unknown>).name === name
  ) as Record<string, unknown> | undefined ?? null;
}

function defaultLibraryCreationLocation(context: LibrarianContext): StorageLocation {
  const locations = context.storageLocations.filter(
    (location) => location.defaultForLibraryCreation === true,
  );
  if (locations.length === 0) {
    throw new Error("Quartz Library ingest requires a default project storage location.");
  }
  if (locations.length > 1) {
    throw new Error("Quartz Library ingest has multiple default project storage locations.");
  }
  const location = locations[0] as StorageLocation;
  if (!location.capabilities.writable) {
    throw new Error(`Quartz Library ingest storage is not writable: ${location.name}`);
  }
  return location;
}

function validateLibraryName(value: string): string {
  const name = value.trim();
  if (name !== value || !libraryNamePattern.test(name)) {
    throw new Error("Library name must use lowercase letters and digits separated by hyphens or underscores.");
  }
  return name;
}

function requiredDescription(value: string): string {
  const description = value.trim();
  if (!description) {
    throw new Error("Library description is required.");
  }
  return description;
}

function validateIngestFiles(files: QuartzLibraryIngestFile[]): QuartzLibraryIngestFile[] {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error("Library ingest requires at least one file.");
  }
  return files.map((file) => {
    if (!file || typeof file !== "object" || Array.isArray(file)) {
      throw new Error("Library ingest files must be objects.");
    }
    if (typeof file.path !== "string" || typeof file.content !== "string") {
      throw new Error("Library ingest files must include path and content strings.");
    }
    const cleanPath = normalizeLibraryRelativePath(file.path);
    return {
      path: cleanPath,
      content: file.content,
    };
  });
}

function normalizeLibraryRelativePath(value: string): string {
  const raw = value.trim().replace(/\\/g, "/");
  if (!raw || raw.startsWith("/")) {
    throw new Error("Library ingest file paths must be relative.");
  }
  const normalized = posix.normalize(raw);
  if (
    normalized === "." ||
    normalized.startsWith("../") ||
    normalized === ".." ||
    normalized === "LIBRARY.toml" ||
    normalized.endsWith("/LIBRARY.toml")
  ) {
    throw new Error("Library ingest file path is not allowed.");
  }
  return normalized;
}

function renderLibraryToml(
  name: string,
  description: string,
  actorUri: string,
): string {
  return [
    "# This is a Harness primitive.",
    "# See also: library://meta-harness",
    "",
    `name = ${JSON.stringify(name)}`,
    "isSystemLibrary = false",
    `description = ${JSON.stringify(description)}`,
    `read_actors = ${JSON.stringify([actorUri])}`,
    `update_actors = ${JSON.stringify([actorUri])}`,
    "",
  ].join("\n");
}

async function closeStorageLocations(locations: StorageLocation[]): Promise<void> {
  const storages = locations
    .map((location) => location.storage)
    .filter((storage, index, all) => all.indexOf(storage) === index);
  await Promise.all(storages.map((storage) => storage.close?.().catch(() => undefined)));
}

function projectConfigPath(): string {
  return process.env.QUARTZ_PROJECT_CONFIG ?? "proj-quartz/.meta-harness.json";
}

async function loadLibrarianModule(): Promise<LibrarianModule> {
  const moduleUrl = pathToFileURL(
    path.resolve(repoRootPath(), "meta-harness/librarian/impl/dist/index.js"),
  ).href;
  return import(/* webpackIgnore: true */ moduleUrl) as Promise<LibrarianModule>;
}

async function loadKnowledgeAgentStorageModule(): Promise<KnowledgeAgentStorageModule> {
  const moduleUrl = pathToFileURL(
    path.resolve(
      repoRootPath(),
      "meta-harness/knowledge-agent/impl/dist/load-local-storage-locations.js",
    ),
  ).href;
  return import(/* webpackIgnore: true */ moduleUrl) as Promise<KnowledgeAgentStorageModule>;
}
