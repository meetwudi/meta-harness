// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.provider-interface: defines the provider boundary used by implementations.
// Supports knowledge-agent.library-index-goal-input: defines the required run input shape.
// Supports knowledge-agent.library-index-only-agent-input: keeps local Library paths out of agent-facing run options.
// Supports knowledge-agent.storage-agnostic-runtime: defines the storage boundary for runtime persistence.
// Supports knowledge-agent.library-scoped-sandbox-staging: defines Library staging data structures.

import type {
  DockerSandboxClient,
  UnixLocalSandboxClient,
} from "@openai/agents/sandbox/local";

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
  sandboxRepoRoot: string;
  libraryIndex: string;
  goal: string;
  model: string;
  client: string;
  conversationId: string;
  sandboxWorkspace: string;
};

export type PreparedRuntime = {
  localRoot: string;
  conversationsLibrary: string;
  memoryLibrary: string;
  sandboxWorkspace: string;
  sandboxRepoRoot: string;
};

export type StoragePrepareInput = {
  repoRootPath: string;
  configuredLocalRoot: string;
  sandboxWorkspaceInput: string;
  conversationId: string;
};

export type LibraryIndexEntry = {
  name: string;
  relative_location?: string;
  location?: string;
};

export type LibraryIndexEntries = {
  path: string;
  entries: LibraryIndexEntry[];
};

export type ResolvedLibrary = {
  name: string;
  sourcePath: string;
  sandboxRelativeLocation: string;
  fromLocalIndex: boolean;
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
  syncFromSandbox(
    options: ProviderRunOptions,
    runtime: PreparedRuntime,
  ): Promise<void>;
  recordConversation(
    options: ProviderRunOptions & { provider: string },
    runtime: PreparedRuntime,
    prompt: string,
    result: unknown,
  ): Promise<void>;
};
