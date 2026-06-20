// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.storage-abstraction: defines the backend-neutral storage boundary.
// Supports librarian.shared-tool-context: defines the context shared by Librarian operations.
// Supports librarian.actor-session-tool-context: carries actor identity and session id in runtime context.
// Supports librarian.tool-call-observability: defines recorded tool call events.

export type TomlRecord = Record<string, unknown>;

export type LibrarianStorage = {
  readText(path: string): Promise<string>;
  writeText(path: string, content: string): Promise<void>;
  makeDirectory(path: string): Promise<void>;
  listDirectory(path: string): Promise<{ name: string; isDirectory: boolean }[]>;
  exists(path: string): Promise<boolean>;
};

export type LibrarianContext = {
  storage: LibrarianStorage;
  libraryIndexPaths: string[];
  libraryIndexBasePaths?: Record<string, string>;
  actorUri: string;
  sessionId: string;
  toolCallEvents: LibrarianToolCallEvent[];
};

export type LibraryIndexEntry = {
  name: string;
  relative_location?: string;
  location?: string;
};

export type ResolvedLibrary = {
  name: string;
  uri: string;
  description: string;
  readable: boolean;
  writable: boolean;
  rootPath: string;
  agentExcludes: string[];
};

export type LibraryListing = {
  name: string;
  uri: string;
  description: string;
  readable: boolean;
  writable: boolean;
};

export type LibraryListResult = {
  libraries: LibraryListing[];
};

export type LibrarianToolDescriptor = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type LibrarianToolCallEvent = {
  order: number;
  sessionId: string;
  toolName: string;
  input: Record<string, unknown>;
  output: unknown;
  recordedAt: string;
};
