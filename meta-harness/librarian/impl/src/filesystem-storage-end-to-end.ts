// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.storage-abstraction: verifies local filesystem storage can back Librarian.
// Supports librarian.tool-call-observability: verifies recorded Librarian tool call events.

import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLibrarianContext } from "./create-librarian-context.js";
import { createLocalFileSystemStorage } from "./create-local-file-system-storage.js";
import { executeLibrarianTool } from "./execute-librarian-tool.js";

const storageRoot = await mkdtemp(join(tmpdir(), "librarian-integration-"));
const librariesRoot = join(storageRoot, "libraries");
const metaHarnessRoot = join(librariesRoot, "meta-harness");
const metaHarnessSetupRoot = join(metaHarnessRoot, "setup");
const manualRoot = join(librariesRoot, "manual");
const manualDocsRoot = join(manualRoot, "docs");
const memoryRoot = join(librariesRoot, "memory");
const storage = createLocalFileSystemStorage();

await storage.makeDirectory(metaHarnessSetupRoot);
await storage.makeDirectory(manualDocsRoot);
await storage.makeDirectory(memoryRoot);
await writeFile(
  join(storageRoot, "LIBRARIES.toml"),
  [
    "[[libraries]]",
    'name = "meta-harness"',
    'relative_location = "libraries/meta-harness"',
    "",
    "[[libraries]]",
    'name = "fixture/manual"',
    'relative_location = "libraries/manual"',
    "",
    "[[libraries]]",
    'name = "fixture/memory"',
    'relative_location = "libraries/memory"',
    "",
  ].join("\n"),
);
await writeFile(
  join(metaHarnessRoot, "LIBRARY.toml"),
  [
    'name = "meta-harness"',
    'description = "Fixture Meta Harness Library."',
    'read_actors = ["actor://knowledge-agent"]',
    'update_actors = []',
    "",
  ].join("\n"),
);
await writeFile(
  join(metaHarnessSetupRoot, "PRIMITIVE-ORIENTATION.md"),
  "Primitive orientation fixture.\n",
);
await writeFile(
  join(manualRoot, "LIBRARY.toml"),
  [
    'name = "manual"',
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
    'name = "memory"',
    'description = "Fixture writable memory Library."',
    'read_actors = ["actor://knowledge-agent"]',
    'update_actors = ["actor://knowledge-agent"]',
    "",
  ].join("\n"),
);

const context = createLibrarianContext({
  storage,
  libraryIndexPaths: [join(storageRoot, "LIBRARIES.toml")],
  actorUri: "actor://knowledge-agent",
  sessionId: "integration-session",
});

const intro = await executeLibrarianTool(context, "librarian_intro", {});
const list = await executeLibrarianTool(context, "librarian_list_libraries", {});
const directFiles = await executeLibrarianTool(context, "librarian_list_files", {
  uri: "library://fixture/manual",
  recursive: false,
});
const recursiveFiles = await executeLibrarianTool(context, "librarian_list_files", {
  uri: "library://fixture/manual",
  recursive: true,
});
await executeLibrarianTool(context, "librarian_update", {
  uri: "library://fixture/memory/magic-number.md",
  content: "12345",
});
await executeLibrarianTool(context, "librarian_read", {
  uri: "library://fixture/memory/magic-number.md",
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
if (!introJson.includes("Primitive orientation fixture.")) {
  throw new Error("Intro did not return primitive orientation content");
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
if (!JSON.stringify(directFiles).includes("library://fixture/manual/README.md")) {
  throw new Error("Direct file listing did not return the root file URI");
}
if (JSON.stringify(directFiles).includes("library://fixture/manual/docs/deep.md")) {
  throw new Error("Direct file listing included a nested file URI");
}
if (!JSON.stringify(recursiveFiles).includes("library://fixture/manual/docs/deep.md")) {
  throw new Error("Recursive file listing did not return the nested file URI");
}

const stored = await readFile(join(memoryRoot, "magic-number.md"), "utf8");
if (stored !== "12345") {
  throw new Error("Direct storage update did not write the expected value");
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
if (callOrder !== "librarian_intro,librarian_list_libraries,librarian_list_files,librarian_list_files,librarian_update,librarian_read,librarian_search") {
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
      callOrder: context.toolCallEvents.map((event) => event.toolName),
      stored,
    },
    null,
    2,
  ),
);
