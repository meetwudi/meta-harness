// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.storage-discovery-runtime: orchestrates storage-discovered Library runs.
// Supports knowledge-agent.provider-interface: routes the run through the provider abstraction.
// Supports knowledge-agent.library-writes-memory: prepares the writable local Library before the SDK run.
// Supports knowledge-agent.openai-trace-conversation-history: writes local prompt and conversation records.
// Supports knowledge-agent.storage-agnostic-runtime: uses storage through an implementation interface.
// Supports knowledge-agent.uses-librarian: routes Library operations through Librarian.
// Supports knowledge-agent.conversation-state: prepares generated conversation state for each turn.
// Supports knowledge-agent.project-config-selection: loads the selected project config for runtime storage.
// Harness-Requirement: knowledge-agent.project-config-selection

import { buildKnowledgeAgentPrompt } from "./build-knowledge-agent-prompt.js";
import { ConversationStateRuntime } from "./conversation-state.js";
import { defaultTurnId } from "./default-turn-id.js";
import { findRepoRoot } from "./find-repo-root.js";
import { loadMetaHarnessConfig } from "./load-meta-harness-config.js";
import { parseArgs } from "./parse-args.js";
import { providerFromName } from "./provider-from-name.js";
import { createInterface } from "node:readline/promises";
import { resultSummary } from "./result-summary.js";
import { storageFromConfig } from "./storage-from-config.js";
import { usage } from "./usage.js";
import type {
  Args,
  KnowledgeAgentProvider,
  KnowledgeAgentStorage,
  PreparedRuntime,
  ProviderRunOptions,
} from "./types.js";

/**
 * Runs the Knowledge Agent CLI command from argument parsing through provider execution.
 */
export async function main(): Promise<number> {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.command !== "run" && parsed.command !== "chat") {
    console.error(usage());
    return 2;
  }
  if (parsed.command === "run" && !parsed.goal) {
    console.error(usage());
    return 2;
  }

  const provider = providerFromName(parsed.provider);
  const repoRootPath = findRepoRoot(parsed.repoRoot);
  const config = loadMetaHarnessConfig(repoRootPath, parsed.projectConfig);
  // Harness-Requirement: knowledge-agent.storage-agnostic-runtime
  const storage = storageFromConfig(config);
  const configuredLocalRoot = parsed.localRoot || config.project?.localRoot;
  if (!configuredLocalRoot) {
    throw new Error(".meta-harness.json project.localRoot is required");
  }
  const runtime = await storage.prepareRuntime({
    repoRootPath,
    configuredLocalRoot,
    sandboxWorkspaceInput: parsed.sandboxWorkspace,
    conversationId: parsed.conversationId,
  });
  const session = storage.createSession(runtime, parsed.conversationId);

  provider.assertReady();
  if (parsed.command === "chat") {
    await runInteractiveChat({
      parsed,
      provider,
      storage,
      runtime,
      repoRootPath,
      model: parsed.model ?? provider.defaultModel,
      session,
    });
    return 0;
  }

  const finalOutput = await runKnowledgeAgentTurn({
    parsed,
    provider,
    storage,
    runtime,
    repoRootPath,
    goal: parsed.goal ?? "",
    turnId: parsed.turnId,
    model: parsed.model ?? provider.defaultModel,
    session,
  });
  console.log(finalOutput);
  return 0;
}

/**
 * Runs an interactive Knowledge Agent conversation on stdin/stdout.
 */
async function runInteractiveChat(input: {
  parsed: Args;
  provider: KnowledgeAgentProvider;
  storage: KnowledgeAgentStorage;
  runtime: PreparedRuntime;
  repoRootPath: string;
  model: string;
  session: ProviderRunOptions["session"];
}): Promise<void> {
  console.error(`Conversation: ${input.parsed.conversationId}`);
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    while (true) {
      const goal = await rl.question("knowledge-agent> ");
      const trimmed = goal.trim();
      if (!trimmed) {
        continue;
      }
      if (trimmed === "/exit" || trimmed === "/quit") {
        break;
      }
      const finalOutput = await runKnowledgeAgentTurn({
        parsed: input.parsed,
        provider: input.provider,
        storage: input.storage,
        runtime: input.runtime,
        repoRootPath: input.repoRootPath,
        goal: trimmed,
        turnId: defaultTurnId(),
        model: input.model,
        session: input.session,
      });
      console.log(finalOutput);
    }
  } finally {
    rl.close();
  }
}

/**
 * Runs one Knowledge Agent turn against the configured provider and session.
 */
async function runKnowledgeAgentTurn(input: {
  parsed: Args;
  provider: KnowledgeAgentProvider;
  storage: KnowledgeAgentStorage;
  runtime: PreparedRuntime;
  repoRootPath: string;
  goal: string;
  turnId: string;
  model: string;
  session: ProviderRunOptions["session"];
}): Promise<string> {
  const librarianContext = input.storage.createLibrarianContext(
    {
      repoRootPath: input.repoRootPath,
      projectConfigPath: input.parsed.projectConfig,
      conversationId: input.parsed.conversationId,
    },
    input.runtime,
  );
  const conversationState = await ConversationStateRuntime.create({
    runtime: input.runtime,
    librarianContext,
  });
  // Harness-Requirement: knowledge-agent.storage-discovery-runtime
  // The only Library context passed to the agent runtime is hidden Librarian tool
  // context; the prompt does not name specific runtime Library paths.
  const options: ProviderRunOptions = {
    repoRoot: input.repoRootPath,
    goal: input.goal,
    model: input.model,
    client: input.parsed.client,
    conversationId: input.parsed.conversationId,
    turnId: input.turnId,
    sandboxWorkspace: input.runtime.sandboxWorkspace,
    librarianContext,
    conversationState,
    session: input.session,
  };
  const prompt = buildKnowledgeAgentPrompt(options);
  const result = await input.provider.runConversation(options);
  await conversationState.persistLatest();
  await input.storage.recordConversation(
    { ...options, provider: input.provider.name },
    input.runtime,
    prompt,
    result,
  );

  const summary = resultSummary(result);
  const finalOutput = summary.finalOutput;
  return typeof finalOutput === "string" ? finalOutput : JSON.stringify(summary);
}
