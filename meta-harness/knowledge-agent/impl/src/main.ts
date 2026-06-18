// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.library-index-goal-input: orchestrates the Library index plus goal run.
// Supports knowledge-agent.provider-interface: routes the run through the provider abstraction.
// Supports knowledge-agent.library-writes-memory: prepares the writable local Library before the SDK run.
// Supports knowledge-agent.openai-trace-conversation-history: writes local prompt and conversation records.
// Supports knowledge-agent.library-index-only-agent-input: keeps Library index as the only agent-facing Library input.
// Supports knowledge-agent.storage-agnostic-runtime: uses storage through an implementation interface.

import { buildRequest } from "./build-request.js";
import { findRepoRoot } from "./find-repo-root.js";
import { loadMetaHarnessConfig } from "./load-meta-harness-config.js";
import { parseArgs } from "./parse-args.js";
import { prepareSandboxRepo } from "./prepare-sandbox-repo.js";
import { providerFromName } from "./provider-from-name.js";
import { resultSummary } from "./result-summary.js";
import { storageFromConfig } from "./storage-from-config.js";
import { usage } from "./usage.js";
import { writeSandboxLocalLibraryIndex } from "./write-sandbox-local-library-index.js";
import type { ProviderRunOptions } from "./types.js";

/**
 * Runs the Knowledge Agent CLI command from argument parsing through provider execution.
 */
export async function main(): Promise<number> {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.command !== "run") {
    console.error(usage());
    return 2;
  }
  if (!parsed.libraryIndex || !parsed.goal) {
    console.error(usage());
    return 2;
  }

  const provider = providerFromName(parsed.provider);
  // Harness-Requirement: knowledge-agent.storage-agnostic-runtime
  const storage = storageFromConfig();
  const repoRootPath = findRepoRoot(parsed.repoRoot);
  const config = loadMetaHarnessConfig(repoRootPath);
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

  // Harness-Requirement: knowledge-agent.library-index-only-agent-input
  // Only the Library index is an agent-facing Library input. Host-local runtime
  // folders are exposed through sandbox Library discovery, not direct request fields.
  const options: ProviderRunOptions = {
    repoRoot: repoRootPath,
    sandboxRepoRoot: runtime.sandboxRepoRoot,
    libraryIndex: parsed.libraryIndex,
    goal: parsed.goal,
    model: parsed.model ?? provider.defaultModel,
    client: parsed.client,
    conversationId: parsed.conversationId,
    sandboxWorkspace: runtime.sandboxWorkspace,
  };
  await prepareSandboxRepo(options);
  await writeSandboxLocalLibraryIndex(options);
  provider.assertReady();
  const prompt = buildRequest(options);
  const result = await provider.runConversation(options);
  await storage.syncFromSandbox(options, runtime);
  await storage.recordConversation({ ...options, provider: provider.name }, runtime, prompt, result);

  const summary = resultSummary(result);
  const finalOutput = summary.finalOutput;
  console.log(typeof finalOutput === "string" ? finalOutput : JSON.stringify(summary));
  return 0;
}
