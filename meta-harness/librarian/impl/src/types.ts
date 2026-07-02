// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.storage-abstraction: defines the backend-neutral storage boundary.
// Supports librarian.shared-tool-context: defines the context shared by Librarian operations.
// Supports librarian.actor-session-tool-context: carries actor identity and session id in runtime context.
// Supports librarian.tool-call-observability: defines recorded tool call events.
// Supports librarian.toolspec-backed-agent-tools: defines ToolSpec runtime records.
// Supports knowledge-agent.local-filesystem-storage-compatibility: keeps storage callers behind the backend-neutral boundary.
// Supports storage.postgres-driver: allows resource-backed discovery modes alongside filesystem modes.
// Harness-Requirement: librarian.context-filters
// Harness-Requirement: librarian.actor-context-filters
// Harness-Requirement: librarian.change-set-operations
// Harness-Requirement: librarian.driver-change-set-application
// Harness-Requirement: change-sets.persistent-change-sets

export type TomlRecord = Record<string, unknown>;

export type LibrarianStorage = {
  readText(path: string): Promise<string>;
  writeText(path: string, content: string): Promise<void>;
  deletePath(path: string): Promise<void>;
  makeDirectory(path: string): Promise<void>;
  listDirectory(path: string): Promise<{ name: string; isDirectory: boolean }[]>;
  exists(path: string): Promise<boolean>;
  readChangeSetBaseline?(path: string): Promise<StorageChangeSetBaseline>;
  previewChangeSetApply?(changes: StorageChangeSetTextChange[]): Promise<StorageChangeSetPreview>;
  applyChangeSet?(changes: StorageChangeSetTextChange[]): Promise<StorageChangeSetApplyResult[]>;
  persistChangeSet?(storePath: string, record: StoragePersistedChangeSet): Promise<void>;
  listChangeSets?(storePath: string, input?: StorageChangeSetListInput): Promise<StoragePersistedChangeSet[]>;
  readChangeSet?(storePath: string, changeSetId: string): Promise<StoragePersistedChangeSet | null>;
};

export type StorageChangeSetBaseline = {
  content: string;
  sha256: string;
  bytes: number;
};

export type StorageChangeSetTextChange = {
  path: string;
  baselineSha256: string;
  content: string;
};

export type StorageChangeSetPreview = {
  clean: boolean;
  conflicts: StorageChangeSetConflict[];
};

export type StorageChangeSetConflict = {
  path: string;
  baselineSha256: string;
  currentSha256: string;
};

export type StorageChangeSetApplyResult = {
  path: string;
  sha256: string;
  bytesWritten: number;
};

export type StoragePersistedChangeSetStatus = "proposed" | "applied" | "superseded" | "abandoned";

export type StoragePersistedChangeSetCheck = {
  id: string;
  status: "pass" | "fail";
  message: string;
  uri?: string;
};

export type StoragePersistedProposedResourceChange = {
  uri: string;
  libraryUri: string;
  resourcePath: string;
  baselineSha256: string;
  baselineBytes: number;
  proposedSha256: string;
  proposedBytes: number;
  proposedContent: string;
  diff: string;
};

export type StoragePersistedChangeSet = {
  id: string;
  format: "git-unified-diff";
  actorUri: string;
  actorUris: string[];
  contextFilters: {
    actorUris: string[];
  };
  status: StoragePersistedChangeSetStatus;
  checks: StoragePersistedChangeSetCheck[];
  changes: StoragePersistedProposedResourceChange[];
  createdAt: string;
  updatedAt: string;
};

export type StorageChangeSetListInput = {
  status?: StoragePersistedChangeSetStatus;
  actorUri?: string;
  contextActorUris?: string[];
};

export type StorageDriverCapabilities = {
  readable: boolean;
  writable: boolean;
  deletable: boolean;
  queryable: boolean;
  blob: boolean;
};

export type StorageDiscoveryMode =
  | "filesystem-root-and-direct-children"
  | "filesystem-recursive"
  | "resource-root-and-direct-children"
  | "resource-recursive";

export type StorageLocation = {
  name: string;
  description: string;
  driverName: string;
  storage: LibrarianStorage;
  capabilities: StorageDriverCapabilities;
  libraryRootPath: string;
  discoveryMode: StorageDiscoveryMode;
  discoveryExcludes: string[];
  discoverLibraries?: boolean;
  defaultForLibraryCreation?: boolean;
  createdLibraryReadActors?: string[];
  createdLibraryUpdateActors?: string[];
  sourceUri?: string;
  guidanceUri?: string;
};

export type LibrarianContext = {
  storage: LibrarianStorage;
  storageLocations: StorageLocation[];
  actorUri: string;
  actorUris: string[];
  sessionId: string;
  contextFilters: LibrarianContextFilters;
  toolCallEvents: LibrarianToolCallEvent[];
};

export type LibrarianContextFilters = {
  actorUris: string[];
};

export type ResolvedLibrary = {
  name: string;
  uri: string;
  description: string;
  isSystemLibrary: boolean;
  readable: boolean;
  writable: boolean;
  deletable: boolean;
  rootPath: string;
  agentExcludes: string[];
  storage: LibrarianStorage;
  storageLocationName: string;
  storageLocationRootPath: string;
};

export type LibraryListing = {
  name: string;
  uri: string;
  description: string;
  isSystemLibrary: boolean;
  readable: boolean;
  writable: boolean;
  deletable: boolean;
};

export type LibraryListResult = {
  libraries: LibraryListing[];
};

export type LibrarianToolDescriptor = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type ToolSpecSchema = {
  type: string;
  properties?: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
  description?: string;
};

export type ToolSpecTestCase = {
  id: string;
  inputJson?: string;
  expected?: string;
  expectedOutputJson?: string;
  expectedError?: string;
};

export type ToolSpecDefinition = {
  name: string;
  description: string;
  implementation: string;
  implementationPath: string;
  allowedActors: string[];
  order: number;
  inputSchema: ToolSpecSchema;
  outputSchema: ToolSpecSchema;
  testCases: ToolSpecTestCase[];
  rootPath: string;
  toolSpecPath: string;
};

export type LibrarianToolCallEvent = {
  order: number;
  sessionId: string;
  actorUri: string;
  actorUris: string[];
  toolName: string;
  input: Record<string, unknown>;
  output: unknown;
  recordedAt: string;
};
