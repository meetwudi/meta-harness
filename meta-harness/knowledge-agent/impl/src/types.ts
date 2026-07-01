// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.provider-interface: defines the provider boundary used by implementations.
// Supports knowledge-agent.storage-discovery-runtime: defines the required run input shape.
// Supports knowledge-agent.uses-librarian: keeps local Library paths out of agent-facing run options.
// Supports knowledge-agent.storage-agnostic-runtime: defines the storage boundary for runtime persistence.
// Supports knowledge-agent.conversation-state: carries generated conversation state through provider runs.
// Supports knowledge-agent.project-config-selection: carries selected project config through local runtime context.
// Supports knowledge-agent.postgres-runtime-storage: carries the runtime text storage driver through the runtime.
// Supports knowledge-agent.openai-reasoning-effort: carries selected reasoning effort through provider runs.
// Supports knowledge-agent.library-scoped-memory-curator: carries the raw latest user message separately from contextualized goal text.
// Supports knowledge-agent.provider-stream-events: defines sanitized stream events for host applications.

import type {
  DockerSandboxClient,
  UnixLocalSandboxClient,
} from "@openai/agents/sandbox/local";
import type {
  LibrarianContext,
  LibrarianStorage,
} from "../../../librarian/impl/dist/index.js";
import type { ConversationStateRuntime } from "./conversation-state.js";
import type { KnowledgeAgentSession } from "./local-jsonl-session.js";
import type {
  ResolvedMemoryCuratorConfig,
  ResolvedRuntimeLibraryConfig,
} from "./load-meta-harness-config.js";

export type ReasoningEffort = "none" | "minimal" | "low" | "medium" | "high" | "xhigh";

export type Args = {
  command?: string;
  repoRoot: string;
  goal?: string;
  latestUserMessage?: string;
  provider: string;
  model?: string;
  reasoningEffort: ReasoningEffort;
  client: string;
  projectConfig: string;
  conversationId: string;
  turnId: string;
  localRoot: string;
  sandboxWorkspace: string;
  streamEvents: boolean;
};

export type KnowledgeAgentStreamEvent =
  | {
      type: "progress";
      message: string;
      source?: KnowledgeAgentStreamSource;
    }
  | {
      type: "reasoning_delta";
      delta: string;
      source?: KnowledgeAgentStreamSource;
    }
  | {
      type: "text_delta";
      delta: string;
      source?: KnowledgeAgentStreamSource;
    };

export type KnowledgeAgentStreamSource = string;

export type ProviderRunOptions = {
  repoRoot: string;
  goal: string;
  latestUserMessage: string;
  model: string;
  reasoningEffort: ReasoningEffort;
  client: string;
  conversationId: string;
  turnId: string;
  sandboxWorkspace: string;
  librarianContext: LibrarianContext;
  conversationState: ConversationStateRuntime;
  session: KnowledgeAgentSession;
  memoryCurator: ResolvedMemoryCuratorConfig;
  onStreamEvent?: (event: KnowledgeAgentStreamEvent) => void;
};

export type PreparedRuntime = {
  localRoot: string;
  conversationsLibrary: string;
  memoryLibrary: string;
  memoryCurator: ResolvedMemoryCuratorConfig;
  conversationRoot: string;
  sessionFile: string;
  tmpStorageLibrariesRoot: string;
  sandboxWorkspace: string;
  runtimeStorage: LibrarianStorage;
};

export type StoragePrepareInput = {
  repoRootPath: string;
  projectRootPath: string;
  configuredLocalRoot: string;
  sandboxWorkspaceInput: string;
  conversationId: string;
  actorUri: string;
  actorUris: string[];
  defaultReadActors?: string[];
  defaultUpdateActors?: string[];
  conversationLibrary: ResolvedRuntimeLibraryConfig;
  memoryCurator: ResolvedMemoryCuratorConfig;
  sharedMemory: {
    enabled: boolean;
    library?: ResolvedRuntimeLibraryConfig;
  };
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
    input: { repoRootPath: string; projectConfigPath: string; conversationId: string },
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
