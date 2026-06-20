// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.provider-interface: defines the provider boundary used by implementations.
// Supports knowledge-agent.library-index-goal-input: defines the required run input shape.
// Supports knowledge-agent.library-index-only-agent-input: keeps local Library paths out of agent-facing run options.
// Supports knowledge-agent.storage-agnostic-runtime: defines the storage boundary for runtime persistence.

import type {
  DockerSandboxClient,
  UnixLocalSandboxClient,
} from "@openai/agents/sandbox/local";
import type { LibrarianContext } from "../../../librarian/impl/dist/index.js";

export type Args = {
  command?: string;
  repoRoot: string;
  libraryIndex?: string;
  goal?: string;
  provider: string;
  model?: string;
  client: string;
  conversationId: string;
  localRoot: string;
  sandboxWorkspace: string;
};

export type ProviderRunOptions = {
  repoRoot: string;
  goal: string;
  model: string;
  client: string;
  conversationId: string;
  sandboxWorkspace: string;
  librarianContext: LibrarianContext;
};

export type PreparedRuntime = {
  localRoot: string;
  conversationsLibrary: string;
  memoryLibrary: string;
  runtimeLibraryIndex: string;
  sandboxWorkspace: string;
};

export type StoragePrepareInput = {
  repoRootPath: string;
  configuredLocalRoot: string;
  sandboxWorkspaceInput: string;
  conversationId: string;
};

export type OpenAISandboxRunOptions = ProviderRunOptions & {
  sandboxClient: DockerSandboxClient | UnixLocalSandboxClient;
};

export type KnowledgeAgentProvider = {
  name: string;
  defaultModel: string;
  assertReady(): void;
  runConversation(options: ProviderRunOptions): Promise<unknown>;
};

export type KnowledgeAgentStorage = {
  prepareRuntime(input: StoragePrepareInput): Promise<PreparedRuntime>;
  createLibrarianContext(
    input: { repoRootPath: string; libraryIndex: string; conversationId: string },
    runtime: PreparedRuntime,
  ): LibrarianContext;
  recordConversation(
    options: ProviderRunOptions & { provider: string },
    runtime: PreparedRuntime,
    prompt: string,
    result: unknown,
  ): Promise<void>;
};
