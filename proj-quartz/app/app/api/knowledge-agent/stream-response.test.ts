import assert from "node:assert/strict";
import {
  parseKnowledgeAgentSubprocessEvent,
  resolveKnowledgeAgentOutput,
  validateKnowledgeAgentModelOptions,
} from "./route";
import {
  createKnowledgeAgentSseStream,
  type AgUiEvent,
  type KnowledgeAgentRunner,
} from "./stream-response";

const fakeRunKnowledgeAgent: KnowledgeAgentRunner = async (input) => {
  input.onProgress?.("Model response started.", "main");
  input.onProgress?.("Tool output received: librarian_list_files.", "main");
  input.onProgress?.("Reading governed knowledge.", "main");
  input.onReasoningDelta?.("Main thinking. ", "main");
  input.onTextDelta?.("Main answer ", "main");
  input.onProgress?.("Reviewing memory.", "memory_curator");
  input.onReasoningDelta?.("Curator thinking.", "memory_curator");
  input.onTextDelta?.("Curator private text.", "memory_curator");
  input.onProgress?.("Model response completed.", "main");
  input.onProgress?.("Memory review complete.", "memory_curator");
  return "Main answer done.";
};

const stream = createKnowledgeAgentSseStream({
  runInput: {
    threadId: "thread-1",
    runId: "run-1",
    messages: [{ role: "user", content: "Summarize the stream." }],
    forwardedProps: {
      model: "gpt-test",
      reasoningEffort: "medium",
    },
  },
  threadId: "thread-1",
  runId: "run-1",
  loadChatConfig: () => ({
    defaultModel: "gpt-test",
    modelOptions: [{ id: "gpt-test", label: "GPT Test" }],
  }),
  latestUserGoal: () => "Summarize the stream.",
  contextualUserGoal: () => "Summarize the stream.",
  reasoningEffortFromInput: () => "medium",
  modelFromInput: () => "gpt-test",
  runKnowledgeAgent: fakeRunKnowledgeAgent,
});

const events = await readSseEvents(stream);
const typeIndex = (type: string) => {
  const index = events.findIndex((event) => event.type === type);
  assert.notEqual(index, -1, `Expected ${type} event.`);
  return index;
};

assert.equal(events[0]?.type, "RUN_STARTED");
const runFinished = events.at(-1);
assert.equal(runFinished?.type, "RUN_FINISHED");
assert.deepEqual(objectRecord(runFinished?.outcome), { type: "success" });

const activitySnapshots = events.filter(
  (event) => event.type === "ACTIVITY_SNAPSHOT",
);
assert.deepEqual(activitySnapshots, []);

const reasoningStart = events[typeIndex("REASONING_START")];
const reasoningContents = events.filter(
  (event) => event.type === "REASONING_MESSAGE_CONTENT",
);
assert.deepEqual(
  reasoningContents.map((event) => event.delta),
  [
    "\n\n[[quartz-source:main]]\n",
    "Main thinking. ",
    "\n\n[[quartz-source:memory_curator]]\n",
    "Curator thinking.",
    "Curator private text.",
    "\n\n[[quartz-complete]]\n",
  ],
);
assert.ok(
  reasoningContents.every(
    (event) => event.messageId === reasoningStart?.messageId,
  ),
);
assert.equal(
  reasoningContents.some((event) =>
    String(event.delta).includes("Memory curator started"),
  ),
  false,
);

const textContents = events.filter(
  (event) => event.type === "TEXT_MESSAGE_CONTENT",
);
assert.deepEqual(
  textContents.map((event) => event.delta),
  ["Main answer ", "done."],
);
assert.equal(
  textContents.some((event) =>
    String(event.delta).includes("Curator private text"),
  ),
  false,
);

const duplicateSafeStream = createKnowledgeAgentSseStream({
  runInput: {
    threadId: "thread-duplicate",
    runId: "run-duplicate",
    messages: [{ role: "user", content: "Avoid duplicate final output." }],
  },
  threadId: "thread-duplicate",
  runId: "run-duplicate",
  loadChatConfig: () => ({
    defaultModel: "gpt-test",
    modelOptions: [{ id: "gpt-test", label: "GPT Test" }],
  }),
  latestUserGoal: () => "Avoid duplicate final output.",
  contextualUserGoal: () => "Avoid duplicate final output.",
  reasoningEffortFromInput: () => "medium",
  modelFromInput: () => "gpt-test",
  runKnowledgeAgent: async (input) => {
    input.onTextDelta?.("Already streamed.", "main");
    return "Already streamed.";
  },
});
const duplicateSafeEvents = await readSseEvents(duplicateSafeStream);
assert.deepEqual(
  duplicateSafeEvents
    .filter((event) => event.type === "TEXT_MESSAGE_CONTENT")
    .map((event) => event.delta),
  ["Already streamed."],
);

const firstTextContentIndex = events.findIndex(
  (event) =>
    event.type === "TEXT_MESSAGE_CONTENT" && event.delta === "Main answer ",
);
assert.ok(firstTextContentIndex > typeIndex("TEXT_MESSAGE_START"));
assert.ok(firstTextContentIndex < typeIndex("RUN_FINISHED"));

assert.ok(typeIndex("REASONING_MESSAGE_END") < typeIndex("TEXT_MESSAGE_END"));
assert.ok(typeIndex("REASONING_END") < typeIndex("TEXT_MESSAGE_END"));

assert.equal(
  resolveKnowledgeAgentOutput({
    finalOutput: "",
    streamedMainText: "Structured main text.",
    rawStdout: "raw diagnostic",
  }),
  "Structured main text.",
);
assert.throws(
  () =>
    resolveKnowledgeAgentOutput({
      finalOutput: "",
      streamedMainText: "",
      rawStdout: "plain stdout",
    }),
  /completed without structured final output or text events/,
);
assert.throws(
  () => parseKnowledgeAgentSubprocessEvent("not json"),
  /Malformed Knowledge Agent stream event JSON/,
);
assert.throws(
  () => parseKnowledgeAgentSubprocessEvent("[]"),
  /expected a JSON object/,
);
assert.throws(
  () => parseKnowledgeAgentSubprocessEvent(JSON.stringify({ type: "progress" })),
  /progress event: message must be a string/,
);
assert.throws(
  () =>
    parseKnowledgeAgentSubprocessEvent(
      JSON.stringify({ type: "reasoning_delta", delta: "thinking" }),
    ),
  /source must be a non-empty string/,
);
assert.throws(
  () => parseKnowledgeAgentSubprocessEvent(JSON.stringify({ type: "unknown" })),
  /unknown event type/,
);
assert.deepEqual(
  validateKnowledgeAgentModelOptions([{ id: "gpt-test", label: "GPT Test" }]),
  [{ id: "gpt-test", label: "GPT Test" }],
);
assert.throws(
  () => validateKnowledgeAgentModelOptions([{ id: "gpt-test" }]),
  /modelOptions\[0\] must include string id and label fields/,
);

console.log(JSON.stringify({ ok: true, eventTypes: events.map((event) => event.type) }, null, 2));

async function readSseEvents(
  readable: ReadableStream<Uint8Array>,
): Promise<AgUiEvent[]> {
  const text = await new Response(readable).text();
  return text
    .trim()
    .split("\n\n")
    .filter(Boolean)
    .map((block) => {
      assert.ok(block.startsWith("data: "));
      return JSON.parse(block.slice("data: ".length)) as AgUiEvent;
    });
}

function objectRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}
