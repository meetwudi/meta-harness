// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.provider-interface: defines the provider boundary used by implementations.
// Supports knowledge-agent.storage-discovery-runtime: defines the required run input shape.
// Supports knowledge-agent.uses-librarian: keeps local Library paths out of agent-facing run options.
// Supports knowledge-agent.storage-agnostic-runtime: defines the storage boundary for runtime persistence.

import type {
  DockerSandboxClient,
  UnixLocalSandboxClient,
} from "@openai/agents/sandbox/local";
import type { LibrarianContext } from "../../../librarian/impl/dist/index.js";
import type { KnowledgeAgentSession } from "./local-jsonl-session.js";

export type Args = {
  command?: string;
  repoRoot: string;
  goal?: string;
  provider: string;
  model?: string;
  client: string;
  conversationId: string;
  turnId: string;
  localRoot: string;
  sandboxWorkspace: string;
};

export type ProviderRunOptions = {
  repoRoot: string;
  goal: string;
  model: string;
  client: string;
  conversationId: string;
  turnId: string;
  sandboxWorkspace: string;
  librarianContext: LibrarianContext;
  session: KnowledgeAgentSession;
};

export type PreparedRuntime = {
  localRoot: string;
  conversationsLibrary: string;
  memoryLibrary: string;
  conversationRoot: string;
  sessionFile: string;
  tmpStorageLibrariesRoot: string;
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
    input: { repoRootPath: string; conversationId: string },
    runtime: PreparedRuntime,
  ): LibrarianContext;
  createSession(runtime: PreparedRuntime, conversationId: string): KnowledgeAgentSession;
  recordConversation(
    options: ProviderRunOptions & { provider: string },
    runtime: PreparedRuntime,
    prompt: string,
    result: unknown,
  ): Promise<void>;
};
