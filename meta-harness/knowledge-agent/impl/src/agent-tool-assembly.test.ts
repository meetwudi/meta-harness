// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.agent-tool-assembly: verifies the primary tool assembly surface.
// Supports knowledge-agent.web-search-tool: verifies hosted web search is exposed only to eligible agent modes.
// Supports knowledge-agent.library-toolspec-openai-tools: verifies Library ToolSpecs can add primary tools.
// Supports knowledge-agent.provider-stream-events: verifies public provider stream events keep progress, reasoning, and text deltas distinct.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { Tool } from "@openai/agents";
import {
  createLibrarianContext,
  createLocalFileSystemStorage,
  discoverLibraryToolSpecs,
} from "../../../librarian/impl/dist/index.js";
import { ConversationStateRuntime } from "./conversation-state.js";
import { createConversationStateOpenAITools } from "./create-conversation-state-openai-tools.js";
import { createKnowledgeAgentOpenAITools } from "./create-knowledge-agent-openai-tools.js";
import { listAvailableToolSpecs } from "./create-toolspec-availability-openai-tools.js";
import { createToolSpecOpenAITools } from "./create-toolspec-openai-tools.js";
import { createWebSearchOpenAITools } from "./create-web-search-openai-tools.js";
import { knowledgeAgentStreamEventsFromRunEvent } from "./knowledge-agent-stream-events.js";
import { executeToolSpecImplementation } from "./resolve-toolspec-implementation.js";

const fakeConversationState = {
  update: async () => ({}),
} as unknown as ConversationStateRuntime;

const storage = createLocalFileSystemStorage();
const storageRoot = await mkdtemp(join(tmpdir(), "knowledge-agent-toolspec-"));
const resourceStorageRoot = await mkdtemp(join(tmpdir(), "knowledge-agent-resource-toolspec-"));
const toolsRoot = join(storageRoot, "fixture-tool-library");
const resourceToolsRoot = join(resourceStorageRoot, "resource-tool-library");
await storage.makeDirectory(toolsRoot);
await storage.makeDirectory(join(toolsRoot, "impl"));
await storage.makeDirectory(join(toolsRoot, "tests"));
await storage.makeDirectory(resourceToolsRoot);
await storage.makeDirectory(join(resourceToolsRoot, "impl"));
await storage.makeDirectory(join(resourceToolsRoot, "tests"));
await storage.makeDirectory(join(resourceToolsRoot, "toolspecs", "missing-number"));
await writeFile(
  join(toolsRoot, "LIBRARY.toml"),
  [
    'name = "fixture-tool-library"',
    'description = "Fixture ToolSpec Library."',
    "isSystemLibrary = false",
    'read_actors = ["actor://knowledge-agent"]',
    'update_actors = ["actor://knowledge-agent"]',
    "",
  ].join("\n"),
);
await writeFile(
  join(toolsRoot, "TOOLSPEC.toml"),
  [
    "# This is a Harness primitive.",
    "# See also: library://meta-harness",
    "",
    'name = "fixture_text_transform"',
    'description = "Transform text for a neutral ToolSpec fixture."',
    'implementation = "impl/fixture-text-transform.js"',
    'allowed_actors = ["actor://knowledge-agent"]',
    "order = 10",
    "",
    "[input_schema]",
    'type = "object"',
    'required = ["text"]',
    "additional_properties = false",
    'properties_json = "{\\"text\\":{\\"type\\":\\"string\\"}}"',
    "",
    "[output_schema]",
    'type = "object"',
    'description = "Transformed fixture text."',
    "",
    "[[test_cases]]",
    'id = "transform-text"',
    'input_json = "{\\"text\\":\\"example\\"}"',
    'expected = "Returns transformed fixture text."',
    "",
  ].join("\n"),
);
await writeFile(
  join(toolsRoot, "impl", "fixture-text-transform.js"),
  [
    "// Generated file. Do not edit directly; update the ToolSpec first.",
    "export function executeToolSpec(input) {",
    "  return { text: String(input.text ?? '').trim().toUpperCase() };",
    "}",
    "",
  ].join("\n"),
);
await writeFile(
  join(toolsRoot, "tests", "unit.test.toml"),
  [
    'id = "fixture-text-transform.unit.fixture"',
    'tool = "fixture_text_transform"',
    'input_json = "{\\"text\\":\\"example\\"}"',
    'expected = "The tool returns transformed text."',
    "",
  ].join("\n"),
);
await writeFile(
  join(resourceToolsRoot, "LIBRARY.toml"),
  [
    'name = "resource-tool-library"',
    'description = "Resource-backed ToolSpec Library."',
    "isSystemLibrary = false",
    'read_actors = ["actor://knowledge-agent"]',
    'update_actors = ["actor://knowledge-agent"]',
    "",
  ].join("\n"),
);
await writeFile(
  join(resourceToolsRoot, "TOOLSPEC.toml"),
  [
    "# This is a Harness primitive.",
    "# See also: library://meta-harness",
    "",
    'name = "resource_number"',
    'description = "Return a deterministic number from a resource-backed ToolSpec fixture."',
    'implementation = "impl/resource-number.js"',
    'allowed_actors = ["actor://knowledge-agent"]',
    "order = 20",
    "",
    "[input_schema]",
    'type = "object"',
    "additional_properties = false",
    'properties_json = "{}"',
    "",
    "[output_schema]",
    'type = "number"',
    'description = "The deterministic fixture number."',
    "",
    "[[test_cases]]",
    'id = "returns-number"',
    'input_json = "{}"',
    'expected_output_json = "42"',
    "",
  ].join("\n"),
);
await writeFile(
  join(resourceToolsRoot, "impl", "resource-number.js"),
  [
    "// Generated file. Do not edit directly; update the ToolSpec first.",
    "export function executeToolSpec() {",
    "  return 42;",
    "}",
    "",
  ].join("\n"),
);
await writeFile(
  join(resourceToolsRoot, "tests", "unit.test.toml"),
  [
    'id = "resource-number.unit.fixture"',
    'tool = "resource_number"',
    'input_json = "{}"',
    'expected_output_json = "42"',
    "",
  ].join("\n"),
);
await writeFile(
  join(resourceToolsRoot, "toolspecs", "missing-number", "TOOLSPEC.toml"),
  [
    "# This is a Harness primitive.",
    "# See also: library://meta-harness",
    "",
    'name = "missing_number"',
    'description = "Fixture ToolSpec with no implementation file."',
    'implementation = "impl/missing-number.js"',
    'allowed_actors = ["actor://knowledge-agent"]',
    "order = 30",
    "",
    "[input_schema]",
    'type = "object"',
    "additional_properties = false",
    'properties_json = "{}"',
    "",
    "[output_schema]",
    'type = "number"',
    'description = "A fixture number."',
    "",
  ].join("\n"),
);

const fakeLibrarianContext = createLibrarianContext({
  storage,
  storageLocations: [
    {
      name: "toolspec-fixture",
      description: "Fixture ToolSpec storage.",
      driverName: "filesystem",
      storage,
      capabilities: {
        readable: true,
        writable: true,
        deletable: true,
        queryable: true,
        blob: true,
      },
      libraryRootPath: storageRoot,
      discoveryMode: "filesystem-root-and-direct-children",
      discoveryExcludes: [],
    },
    {
      name: "toolspec-resource-fixture",
      description: "Resource-backed ToolSpec storage.",
      driverName: "postgres",
      storage,
      capabilities: {
        readable: true,
        writable: true,
        deletable: true,
        queryable: true,
        blob: true,
      },
      libraryRootPath: resourceStorageRoot,
      discoveryMode: "resource-root-and-direct-children",
      discoveryExcludes: [],
    },
  ],
  actorUri: "actor://knowledge-agent",
  actorUris: ["actor://knowledge-agent"],
  sessionId: "agent-tool-assembly-test",
});

const webSearchTools = createWebSearchOpenAITools();
assert.equal(webSearchTools.length, 1);
assertWebSearchTool(webSearchTools[0]);

const primaryToolNames = (await createKnowledgeAgentOpenAITools({
  conversationState: fakeConversationState,
  librarianContext: fakeLibrarianContext,
})).map((tool) => tool.name);
assert.ok(primaryToolNames.includes("web_search"));
assert.ok(primaryToolNames.includes("librarian_intro"));
assert.ok(primaryToolNames.includes("goal_create"));
assert.ok(primaryToolNames.includes("conversation_state_update"));
assert.ok(primaryToolNames.includes("toolspec_list_available"));
assert.ok(primaryToolNames.includes("fixture_text_transform"));
assert.ok(primaryToolNames.includes("resource_number"));
assert.equal(primaryToolNames.includes("missing_number"), false);

const discoveredToolSpecs = await discoverLibraryToolSpecs(fakeLibrarianContext);
const resourceToolSpec = discoveredToolSpecs.find((toolSpec) => toolSpec.name === "resource_number");
assert.ok(resourceToolSpec);
assert.equal(resourceToolSpec.implementationAvailable, true);
assert.equal(resourceToolSpec.implementationLoadMode, "source");
assert.equal(resourceToolSpec.implementation, "impl/resource-number.js");
assert.match(resourceToolSpec.implementationContent ?? "", /executeToolSpec/);
assert.equal(await executeToolSpecImplementation(resourceToolSpec, {}), 42);
const missingToolSpec = discoveredToolSpecs.find((toolSpec) => toolSpec.name === "missing_number");
assert.ok(missingToolSpec);
assert.equal(missingToolSpec.implementationAvailable, false);

const toolSpecAvailability = await listAvailableToolSpecs({
  librarianContext: fakeLibrarianContext,
  reservedToolNames: new Set(["toolspec_list_available"]),
  includeUnavailable: true,
});
assert.deepEqual(
  toolSpecAvailability.availableTools.map((toolSpec) => toolSpec.name),
  ["fixture_text_transform", "resource_number"],
);
assert.ok(
  toolSpecAvailability.unavailableToolSpecs?.some((toolSpec) =>
    toolSpec.name === "missing_number" &&
    /implementation is missing or unsupported/.test(toolSpec.reason)
  ),
);

const directToolSpecTools = await createToolSpecOpenAITools({
  librarianContext: fakeLibrarianContext,
  reservedToolNames: new Set(),
});
assert.ok(directToolSpecTools.some((tool) => tool.name === "resource_number"));
assert.equal(directToolSpecTools.some((tool) => tool.name === "missing_number"), false);

const stateRoot = join(storageRoot, "conversation-state");
await storage.makeDirectory(stateRoot);
const conversationState = new ConversationStateRuntime(
  storage,
  join(stateRoot, "conversation-state.toml"),
  fakeLibrarianContext,
  {
    actorUri: "actor://knowledge-agent",
    mentionedGoals: [],
    mentionedLibraries: [],
  },
);
await assert.rejects(
  () => conversationState.update({ memoryCurationLibraries: null } as never),
  /memoryCurationLibraries must use repeated mention tables/,
);
const [conversationStateTool] = createConversationStateOpenAITools({
  update: async () => {
    throw new Error("conversation state update should not run for malformed input");
  },
} as unknown as ConversationStateRuntime);
assert.equal(conversationStateTool.type, "function");
assert.match(
  String(await conversationStateTool.invoke({} as never, "null")),
  /conversation_state_update input must be an object/,
);
const malformedStateRoot = join(storageRoot, "malformed-conversation-state");
await storage.makeDirectory(malformedStateRoot);
await storage.writeText(
  join(malformedStateRoot, "conversation-state.toml"),
  [
    "[[mentioned_library]]",
    'uri = "library://fixture-tool-library"',
    "",
  ].join("\n"),
);
await assert.rejects(
  () =>
    ConversationStateRuntime.create({
      runtime: {
        conversationRoot: malformedStateRoot,
        runtimeStorage: storage,
      } as never,
      librarianContext: fakeLibrarianContext,
    }),
  /conversation-state\.toml is missing required conversation state field: actor_uri/,
);

const toolSpecToolsSource = readFileSync(
  resolve("src/create-toolspec-openai-tools.ts"),
  "utf8",
);
const toolSpecImplementationResolverSource = readFileSync(
  resolve("src/resolve-toolspec-implementation.ts"),
  "utf8",
);
assert.match(toolSpecToolsSource, /discoverLibraryToolSpecs/);
assert.match(toolSpecToolsSource, /executeToolSpecImplementation/);
assert.doesNotMatch(toolSpecToolsSource, /fixture_text_transform/);
assert.doesNotMatch(toolSpecToolsSource, /fixture-text-transform/);
assert.doesNotMatch(
  toolSpecToolsSource,
  /implementationPath\.endsWith/,
);
assert.match(toolSpecImplementationResolverSource, /pathToFileURL/);
assert.match(toolSpecImplementationResolverSource, /data:text\/javascript;base64/);
assert.match(toolSpecImplementationResolverSource, /await import\(moduleUrl\.href\)/);
assert.match(toolSpecImplementationResolverSource, /executeToolSpec/);
assert.match(toolSpecImplementationResolverSource, /implementationAvailable/);
assert.doesNotMatch(toolSpecImplementationResolverSource, /fixture_text_transform/);
assert.doesNotMatch(toolSpecImplementationResolverSource, /fixture-text-transform/);

const routineSource = readFileSync(
  resolve("src/create-routine-handoff-agents.ts"),
  "utf8",
);
assert.match(routineSource, /createWebSearchOpenAITools/);
assert.match(routineSource, /openAIReasoningSettings/);

const memoryCuratorSource = readFileSync(
  resolve("src/run-memory-curator.ts"),
  "utf8",
);
assert.doesNotMatch(memoryCuratorSource, /createWebSearchOpenAITools/);
assert.doesNotMatch(memoryCuratorSource, /webSearchTool/);
assert.match(memoryCuratorSource, /knowledgeAgentStreamEventsFromRunEvent/);
assert.match(memoryCuratorSource, /source: "memory_curator"/);
assert.match(memoryCuratorSource, /stream: true/);

const mainRunSource = readFileSync(
  resolve("src/execute-openai-sandbox-run.ts"),
  "utf8",
);
assert.match(mainRunSource, /source: "main"/);
assert.match(mainRunSource, /result\.finalOutput/);
assert.match(mainRunSource, /type: "text_delta"/);

const openAIConversationSource = readFileSync(
  resolve("src/run-openai-conversation.ts"),
  "utf8",
);
assert.match(openAIConversationSource, /openAIReasoningSettings/);
assert.match(memoryCuratorSource, /openAIReasoningSettings/);

const goalAuditorSource = readFileSync(
  resolve("src/create-goal-auditor-handoff-agent.ts"),
  "utf8",
);
assert.doesNotMatch(goalAuditorSource, /createWebSearchOpenAITools/);
assert.doesNotMatch(goalAuditorSource, /webSearchTool/);
assert.match(goalAuditorSource, /openAIReasoningSettings/);

assert.deepEqual(
  knowledgeAgentStreamEventsFromRunEvent({
    type: "raw_model_stream_event",
    data: {
      event: {
        type: "response.reasoning_summary_text.delta",
        delta: "Inspecting Library context.",
      },
    },
  } as Parameters<typeof knowledgeAgentStreamEventsFromRunEvent>[0]),
  [{ type: "reasoning_delta", delta: "Inspecting Library context." }],
);
assert.deepEqual(
  knowledgeAgentStreamEventsFromRunEvent({
    type: "raw_model_stream_event",
    data: {
      event: {
        type: "response.output_text.delta",
        delta: "Intermediate narration.",
      },
    },
  } as Parameters<typeof knowledgeAgentStreamEventsFromRunEvent>[0]),
  [],
);
assert.deepEqual(
  knowledgeAgentStreamEventsFromRunEvent({
    type: "raw_model_stream_event",
    data: {
      event: {
        type: "output_text_delta",
        delta: "Answer text",
      },
    },
  } as Parameters<typeof knowledgeAgentStreamEventsFromRunEvent>[0]),
  [],
);
assert.deepEqual(
  knowledgeAgentStreamEventsFromRunEvent({
    type: "raw_model_stream_event",
    data: {
      event: {
        type: "response.created",
      },
    },
  } as Parameters<typeof knowledgeAgentStreamEventsFromRunEvent>[0]),
  [],
);
assert.deepEqual(
  knowledgeAgentStreamEventsFromRunEvent({
    type: "raw_model_stream_event",
    data: {
      event: {
        type: "response.completed",
      },
    },
  } as Parameters<typeof knowledgeAgentStreamEventsFromRunEvent>[0]),
  [],
);
assert.deepEqual(
  knowledgeAgentStreamEventsFromRunEvent({
    type: "run_item_stream_event",
    name: "tool_called",
    item: {
      rawItem: {
        name: "librarian_read",
      },
    },
  } as Parameters<typeof knowledgeAgentStreamEventsFromRunEvent>[0]),
  [{ type: "progress", message: "Reading governed knowledge." }],
);
assert.deepEqual(
  knowledgeAgentStreamEventsFromRunEvent({
    type: "run_item_stream_event",
    name: "tool_output",
    item: {
      rawItem: {
        name: "librarian_read",
      },
    },
  } as Parameters<typeof knowledgeAgentStreamEventsFromRunEvent>[0]),
  [],
);

console.log(
  JSON.stringify(
    {
      ok: true,
      webSearchTool: webSearchTools[0],
      primaryToolNames,
    },
    null,
    2,
  ),
);

function assertWebSearchTool(tool: Tool): void {
  const hostedTool = tool as {
    type?: unknown;
    name?: unknown;
    providerData?: Record<string, unknown>;
  };
  assert.equal(hostedTool.type, "hosted_tool");
  assert.equal(hostedTool.name, "web_search");
  assert.equal(hostedTool.providerData?.type, "web_search");
  assert.equal(hostedTool.providerData?.name, "web_search");
  assert.equal(hostedTool.providerData?.search_context_size, "medium");
  assert.equal(hostedTool.providerData?.external_web_access, true);
}
