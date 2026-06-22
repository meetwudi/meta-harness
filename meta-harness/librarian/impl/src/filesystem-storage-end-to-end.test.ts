// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.storage-abstraction: verifies local filesystem storage can back Librarian in the integration test.
// Supports librarian.tool-call-observability: verifies recorded Librarian tool call events.

import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLibrarianContext } from "./create-librarian-context.js";
import { createLocalFileSystemStorage } from "./create-local-file-system-storage.js";
import { executeLibrarianTool } from "./execute-librarian-tool.js";

const storageRoot = await mkdtemp(join(tmpdir(), "librarian-integration-"));
const createdStorageRoot = await mkdtemp(join(tmpdir(), "librarian-created-"));
const librariesRoot = join(storageRoot, "libraries");
const metaHarnessRoot = join(librariesRoot, "meta-harness");
const metaHarnessSetupRoot = join(metaHarnessRoot, "setup");
const metaHarnessStorageRoot = join(metaHarnessRoot, "storage");
const manualRoot = join(librariesRoot, "manual");
const manualDocsRoot = join(manualRoot, "docs");
const memoryRoot = join(librariesRoot, "memory");
const createdLibrariesRoot = join(createdStorageRoot, "libraries");
const createdRoot = join(createdLibrariesRoot, "tmp-created-library");
const storage = createLocalFileSystemStorage();

await storage.makeDirectory(metaHarnessSetupRoot);
await storage.makeDirectory(metaHarnessStorageRoot);
await storage.makeDirectory(manualDocsRoot);
await storage.makeDirectory(memoryRoot);
await storage.makeDirectory(createdLibrariesRoot);
await writeFile(
  join(metaHarnessRoot, "LIBRARY.toml"),
  [
    'name = "meta-harness"',
    'description = "Fixture Meta Harness Library."',
    'read_actors = ["actor://knowledge-agent"]',
    'update_actors = ["actor://task/project-harness/tasks/concise-cleanup"]',
    "",
  ].join("\n"),
);
await writeFile(
  join(metaHarnessSetupRoot, "PRIMITIVE-ORIENTATION.md"),
  "Primitive orientation fixture.\n",
);
await writeFile(
  join(metaHarnessSetupRoot, "LIBRARY-CREATION.md"),
  "Library creation protocol fixture.\n",
);
await writeFile(
  join(metaHarnessStorageRoot, "STORAGE.md"),
  "Storage guidance fixture.\n",
);
await writeFile(
  join(metaHarnessStorageRoot, "knowledge-agent-local-storage-locations.toml"),
  [
    "[[storage_locations]]",
    'name = "repository"',
    'description = "Fixture checked-in repository storage location."',
    'driver_name = "filesystem"',
    "readable = true",
    "writable = true",
    "deletable = true",
    "queryable = true",
    "",
    "[[storage_locations]]",
    'name = "machine-local"',
    'description = "Fixture local storage location."',
    'driver_name = "filesystem"',
    "readable = true",
    "writable = true",
    "deletable = true",
    "queryable = true",
    "",
    "[[storage_locations]]",
    'name = "tmp-local"',
    'description = "Temporary local filesystem storage location for Library creation tests."',
    'driver_name = "filesystem"',
    "readable = true",
    "writable = true",
    "deletable = true",
    "queryable = true",
    "",
  ].join("\n"),
);
await writeFile(
  join(manualRoot, "LIBRARY.toml"),
  [
    'name = "fixture/manual"',
    'description = "Fixture manual Library."',
    'read_actors = ["actor://knowledge-agent"]',
    'update_actors = []',
    "",
  ].join("\n"),
);
await writeFile(
  join(manualRoot, "README.md"),
  "Manual root file.\n",
);
await writeFile(
  join(manualDocsRoot, "deep.md"),
  "Manual nested file.\n",
);
await writeFile(
  join(memoryRoot, "LIBRARY.toml"),
  [
    'name = "fixture/memory"',
    'description = "Fixture writable memory Library."',
    'read_actors = ["actor://knowledge-agent"]',
    'update_actors = ["actor://knowledge-agent"]',
    "",
  ].join("\n"),
);

const context = createLibrarianContext({
  storage,
  storageLocations: [
    {
      name: "repository",
      description: "Fixture checked-in repository storage location.",
      driverName: "filesystem",
      storage,
      capabilities: {
        readable: true,
        writable: true,
        deletable: true,
        queryable: true,
      },
      libraryRootPath: librariesRoot,
      discoveryMode: "filesystem-root-and-direct-children",
      discoveryExcludes: [],
      sourceUri: "library://meta-harness/storage/knowledge-agent-local-storage-locations.toml",
      guidanceUri: "library://meta-harness/storage/STORAGE.md",
    },
    {
      name: "tmp-local",
      description: "Temporary local filesystem storage location for Library creation tests.",
      driverName: "filesystem",
      storage,
      capabilities: {
        readable: true,
        writable: true,
        deletable: true,
        queryable: true,
      },
      libraryRootPath: createdLibrariesRoot,
      discoveryMode: "filesystem-root-and-direct-children",
      discoveryExcludes: [],
      sourceUri: "library://meta-harness/storage/knowledge-agent-local-storage-locations.toml",
      guidanceUri: "library://meta-harness/storage/STORAGE.md",
    },
  ],
  actorUri: "actor://knowledge-agent",
  actorUris: ["actor://task/project-harness/tasks/concise-cleanup"],
  sessionId: "integration-session",
});

const intro = await executeLibrarianTool(context, "librarian_intro", {});
const list = await executeLibrarianTool(context, "librarian_list_libraries", {});
const storageDefinitions = await executeLibrarianTool(context, "librarian_read", {
  uri: "library://meta-harness/storage/knowledge-agent-local-storage-locations.toml",
});
const directFiles = await executeLibrarianTool(context, "librarian_list_files", {
  uri: "library://fixture/manual",
  recursive: false,
});
const recursiveFiles = await executeLibrarianTool(context, "librarian_list_files", {
  uri: "library://fixture/manual",
  recursive: true,
});
await executeLibrarianTool(context, "librarian_create_library", {
  storageLocationName: "tmp-local",
  name: "tmp-created-library",
  description: "Library created in tmp local storage.",
});
await executeLibrarianTool(context, "librarian_update", {
  uri: "library://fixture/memory/magic-number.md",
  content: "12345",
});
await executeLibrarianTool(context, "librarian_update", {
  uri: "library://tmp-created-library/note.md",
  content: "created in tmp locally",
});
await executeLibrarianTool(context, "librarian_read", {
  uri: "library://fixture/memory/magic-number.md",
});
await executeLibrarianTool(context, "librarian_read", {
  uri: "library://tmp-created-library/note.md",
});
await executeLibrarianTool(context, "librarian_search", {
  libraryUriPatterns: ["library://fixture/*"],
  query: "12345",
  limit: 5,
});

const listJson = JSON.stringify(list);
const introJson = JSON.stringify(intro);
if (!introJson.includes('"libraryUriPatterns":["library://meta-harness"]')) {
  throw new Error("Intro did not return the Meta Harness onboarding Library");
}
if (!introJson.includes('"uri":"library://meta-harness/setup/PRIMITIVE-ORIENTATION.md"')) {
  throw new Error("Intro did not point to primitive orientation");
}
if (!introJson.includes('"uri":"library://meta-harness/setup/LIBRARY-CREATION.md"')) {
  throw new Error("Intro did not point to Library creation protocol");
}
if (!introJson.includes('"uri":"library://meta-harness/storage/STORAGE.md"')) {
  throw new Error("Intro did not point to storage guidance");
}
if (!introJson.includes("Primitive orientation fixture.")) {
  throw new Error("Intro did not return primitive orientation content");
}
if (!introJson.includes("Library creation protocol fixture.")) {
  throw new Error("Intro did not return Library creation protocol content");
}
if (!introJson.includes("Storage guidance fixture.")) {
  throw new Error("Intro did not return storage guidance content");
}
if (!listJson.includes('"uri":"library://meta-harness"')) {
  throw new Error("Meta Harness Library was not listed");
}
if (!listJson.includes('"uri":"library://fixture/manual"')) {
  throw new Error("Manual Library was not listed");
}
if (!listJson.includes('"uri":"library://fixture/memory"')) {
  throw new Error("Memory Library was not listed");
}
if (!listJson.includes('"writable":false')) {
  throw new Error("Manual Library writable state was not verified");
}
if (!listJson.includes('"writable":true')) {
  throw new Error("Memory Library writable state was not verified");
}
const listedLibraries = (list as {
  libraries: Array<{ uri: string; writable: boolean }>;
}).libraries;
if (!listedLibraries.find((library) => library.uri === "library://meta-harness")?.writable) {
  throw new Error("Task actor governance did not grant Meta Harness update access");
}
const storageDefinitionsContent = String(
  (storageDefinitions as { content?: unknown }).content,
);
if (!storageDefinitionsContent.includes('name = "repository"')) {
  throw new Error("Storage knowledge did not include repository");
}
if (!storageDefinitionsContent.includes('name = "machine-local"')) {
  throw new Error("Storage knowledge did not include machine-local");
}
if (!storageDefinitionsContent.includes('name = "tmp-local"')) {
  throw new Error("Storage knowledge did not include tmp-local");
}
if (!storageDefinitionsContent.includes("writable = true")) {
  throw new Error("Storage knowledge did not include a writable location");
}
if (!JSON.stringify(directFiles).includes("library://fixture/manual/README.md")) {
  throw new Error("Direct file listing did not return the root file URI");
}
if (JSON.stringify(directFiles).includes("library://fixture/manual/docs/deep.md")) {
  throw new Error("Direct file listing included a nested file URI");
}
if (!JSON.stringify(recursiveFiles).includes("library://fixture/manual/docs/deep.md")) {
  throw new Error("Recursive file listing did not return the nested file URI");
}

const createdLibraryToml = await readFile(join(createdRoot, "LIBRARY.toml"), "utf8");
if (!createdLibraryToml.includes('name = "tmp-created-library"')) {
  throw new Error("Created tmp Library did not write LIBRARY.toml");
}
const listAfterCreate = await executeLibrarianTool(context, "librarian_list_libraries", {});
if (!JSON.stringify(listAfterCreate).includes('"uri":"library://tmp-created-library"')) {
  throw new Error("Created tmp Library was not discovered from storage");
}
const stored = await readFile(join(memoryRoot, "magic-number.md"), "utf8");
if (stored !== "12345") {
  throw new Error("Direct storage update did not write the expected value");
}
const createdStored = await readFile(join(createdRoot, "note.md"), "utf8");
if (createdStored !== "created in tmp locally") {
  throw new Error("Created tmp Library update did not write the expected value");
}

const searchEvent = context.toolCallEvents.find((event) => event.toolName === "librarian_search");
if (!JSON.stringify(searchEvent).includes("library://fixture/memory")) {
  throw new Error("Multi-Library search did not return the matching Library");
}
if (!JSON.stringify(searchEvent).includes("library://fixture/memory/magic-number.md")) {
  throw new Error("Multi-Library search did not return the matching resource URI");
}
if (JSON.stringify(context.toolCallEvents).includes('"path"')) {
  throw new Error("Recorded Librarian tool calls should identify files by resource URI");
}

const callOrder = context.toolCallEvents.map((event) => event.toolName).join(",");
if (callOrder !== "librarian_intro,librarian_list_libraries,librarian_read,librarian_list_files,librarian_list_files,librarian_create_library,librarian_update,librarian_update,librarian_read,librarian_read,librarian_search,librarian_list_libraries") {
  throw new Error(`Unexpected tool call order: ${callOrder}`);
}
if (!context.toolCallEvents.every((event) => event.input)) {
  throw new Error("A recorded tool call event is missing input");
}
if (!JSON.stringify(context.toolCallEvents).includes("<redacted file contents from the server>")) {
  throw new Error("Recorded tool call events did not redact file contents");
}

console.log(
  JSON.stringify(
    {
      ok: true,
      storageRoot,
      createdStorageRoot,
      callOrder: context.toolCallEvents.map((event) => event.toolName),
      stored,
      createdStored,
    },
    null,
    2,
  ),
);
