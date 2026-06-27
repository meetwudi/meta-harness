// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.agent-tool-assembly: verifies the primary tool assembly surface.
// Supports knowledge-agent.web-search-tool: verifies hosted web search is exposed only to eligible agent modes.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Tool } from "@openai/agents";
import type { LibrarianContext } from "../../../librarian/impl/dist/index.js";
import type { ConversationStateRuntime } from "./conversation-state.js";
import { createKnowledgeAgentOpenAITools } from "./create-knowledge-agent-openai-tools.js";
import { createWebSearchOpenAITools } from "./create-web-search-openai-tools.js";

const fakeConversationState = {
  update: async () => ({}),
} as unknown as ConversationStateRuntime;

const fakeLibrarianContext = {
  actorUri: "actor://knowledge-agent",
  actorUris: ["actor://knowledge-agent"],
  sessionId: "agent-tool-assembly-test",
  toolCallEvents: [],
} as unknown as LibrarianContext;

const webSearchTools = createWebSearchOpenAITools();
assert.equal(webSearchTools.length, 1);
assertWebSearchTool(webSearchTools[0]);

const primaryToolNames = createKnowledgeAgentOpenAITools({
  conversationState: fakeConversationState,
  librarianContext: fakeLibrarianContext,
}).map((tool) => tool.name);
assert.ok(primaryToolNames.includes("web_search"));
assert.ok(primaryToolNames.includes("librarian_intro"));
assert.ok(primaryToolNames.includes("goal_create"));
assert.ok(primaryToolNames.includes("conversation_state_update"));

const routineSource = readFileSync(
  resolve("src/create-routine-handoff-agents.ts"),
  "utf8",
);
assert.match(routineSource, /createWebSearchOpenAITools/);

const memoryCuratorSource = readFileSync(
  resolve("src/run-memory-curator.ts"),
  "utf8",
);
assert.doesNotMatch(memoryCuratorSource, /createWebSearchOpenAITools/);
assert.doesNotMatch(memoryCuratorSource, /webSearchTool/);

const goalAuditorSource = readFileSync(
  resolve("src/create-goal-auditor-handoff-agent.ts"),
  "utf8",
);
assert.doesNotMatch(goalAuditorSource, /createWebSearchOpenAITools/);
assert.doesNotMatch(goalAuditorSource, /webSearchTool/);

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
