import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import {
  createConversation,
  deleteConversations,
  listConversations,
  readConversation,
  reasoningContentFromRecords,
  runtimeStorageFromConfig,
  writeTurnReasoning,
  type ReasoningDeltaRecord,
} from "./route";

type DirectoryEntry = { name: string; isDirectory: boolean };

class MemoryStorage {
  private readonly files = new Map<string, string>();
  private readonly directories = new Set<string>(["/"]);

  async readText(path: string): Promise<string> {
    const normalized = this.normalize(path);
    const content = this.files.get(normalized);
    if (content === undefined) {
      throw new Error(`Missing file: ${normalized}`);
    }
    return content;
  }

  async writeText(path: string, content: string): Promise<void> {
    const normalized = this.normalize(path);
    await this.makeDirectory(dirname(normalized));
    this.files.set(normalized, content);
  }

  async deletePath(path: string): Promise<void> {
    const normalized = this.normalize(path);
    this.files.delete(normalized);
    this.directories.delete(normalized);
  }

  async makeDirectory(path: string): Promise<void> {
    const normalized = this.normalize(path);
    const absolute = normalized.startsWith("/");
    const parts = normalized.split("/").filter(Boolean);
    let current = absolute ? "/" : "";
    this.directories.add(current || ".");
    for (const part of parts) {
      current = current === "/" ? `/${part}` : current ? `${current}/${part}` : part;
      this.directories.add(current);
    }
  }

  async listDirectory(path: string): Promise<DirectoryEntry[]> {
    const normalized = this.normalize(path);
    const prefix = normalized === "/" ? "/" : `${normalized}/`;
    const entries = new Map<string, boolean>();

    for (const directory of this.directories) {
      this.addDirectChild(entries, prefix, directory, true);
    }
    for (const file of this.files.keys()) {
      this.addDirectChild(entries, prefix, file, false);
    }

    return [...entries]
      .map(([name, isDirectory]) => ({ name, isDirectory }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  async exists(path: string): Promise<boolean> {
    const normalized = this.normalize(path);
    return this.files.has(normalized) || this.directories.has(normalized);
  }

  private addDirectChild(
    entries: Map<string, boolean>,
    prefix: string,
    path: string,
    pathIsDirectory: boolean,
  ) {
    if (path === prefix.slice(0, -1) || !path.startsWith(prefix)) {
      return;
    }

    const remainder = path.slice(prefix.length);
    if (!remainder) {
      return;
    }

    const [name, ...descendants] = remainder.split("/");
    if (!name) {
      return;
    }

    entries.set(name, entries.get(name) === true || pathIsDirectory || descendants.length > 0);
  }

  private normalize(path: string): string {
    return path.replace(/\/+/g, "/").replace(/\/$/, "") || "/";
  }
}

const libraryRoot = "/libraries/knowledge-agent-conversations";

async function seedConversation(input: {
  storage: MemoryStorage;
  folderName: string;
  conversationId?: string;
  createdAt?: string;
  updatedAt?: string;
  turns?: Array<{
    turnId: string;
    startedAt: string;
    latestUserMessage: string;
  }>;
  assistantMessages?: string[];
  reasoningByTurn?: Record<string, ReasoningDeltaRecord[]>;
}) {
  const conversationId = input.conversationId ?? input.folderName;
  const conversationRoot = join(libraryRoot, input.folderName);
  await input.storage.makeDirectory(conversationRoot);
  await input.storage.writeText(
    join(conversationRoot, "CONVERSATION.toml"),
    [
      `conversation_id = ${JSON.stringify(conversationId)}`,
      input.createdAt ? `created_at = ${JSON.stringify(input.createdAt)}` : "",
      input.updatedAt ? `updated_at = ${JSON.stringify(input.updatedAt)}` : "",
      'session_file = "session.jsonl"',
      "",
    ].filter(Boolean).join("\n"),
  );

  for (const turn of input.turns ?? []) {
    const turnRoot = join(conversationRoot, "turns", turn.turnId);
    await input.storage.makeDirectory(turnRoot);
    await input.storage.writeText(
      join(turnRoot, "summary.md"),
      [
        `# Turn ${turn.turnId}`,
        "",
        `Started: ${turn.startedAt}`,
        "",
        `Conversation: ${conversationId}`,
        "",
        `User request: ${turn.latestUserMessage}`,
        "",
        `Latest user message: ${turn.latestUserMessage}`,
        "",
        "Provider: test",
        "",
        "Model: gpt-test",
        "",
      ].join("\n"),
    );
    const reasoningRecords = input.reasoningByTurn?.[turn.turnId];
    if (reasoningRecords) {
      await writeTurnReasoning({
        storage: input.storage,
        libraryRoot,
        conversationId,
        turnId: turn.turnId,
        records: reasoningRecords,
      });
    }
  }

  if (input.assistantMessages) {
    await input.storage.writeText(
      join(conversationRoot, "session.jsonl"),
      [
        JSON.stringify({
          type: "message",
          role: "assistant",
          providerData: { phase: "draft" },
          content: [{ type: "output_text", text: "This draft should be hidden." }],
        }),
        ...input.assistantMessages.map((text) =>
          JSON.stringify({
            type: "message",
            role: "assistant",
            providerData: { phase: "final_answer" },
            content: [{ type: "output_text", text }],
          }),
        ),
      ].join("\n"),
    );
  }
}

const storage = new MemoryStorage();
await storage.makeDirectory(libraryRoot);
await seedConversation({
  storage,
  folderName: "quartz-thread-alpha",
  turns: [
    {
      turnId: "turn-1",
      startedAt: "2026-06-27T19:24:18.525Z",
      latestUserMessage: "what tool would you use for getting yt transcript",
    },
  ],
  assistantMessages: ["Use the governed ToolSpec-backed YouTube transcript tool."],
  reasoningByTurn: {
    "turn-1": [
      {
        source: "main",
        delta: "Checking governed ToolSpec knowledge.",
        recordedAt: "2026-06-27T19:24:19.000Z",
      },
      {
        source: "memory_curator",
        delta: "Reviewing durable memory.",
        recordedAt: "2026-06-27T19:24:20.000Z",
      },
    ],
  },
});

const conversation = await readConversation({
  storage,
  libraryRoot,
  folderName: "quartz-thread-alpha",
  includeMessages: true,
});
assert.equal(conversation?.id, "thread-alpha");
assert.equal(conversation?.conversationId, "quartz-thread-alpha");
assert.equal(conversation?.title, "what tool would you use for getting yt transcript");
assert.equal(conversation?.createdAt, "2026-06-27T19:24:18.525Z");
assert.deepEqual(conversation?.messages, [
  {
    id: "turn-1-user",
    role: "user",
    content: "what tool would you use for getting yt transcript",
  },
  {
    id: "turn-1-reasoning",
    role: "reasoning",
    content: reasoningContentFromRecords([
      {
        source: "main",
        delta: "Checking governed ToolSpec knowledge.",
        recordedAt: "2026-06-27T19:24:19.000Z",
      },
      {
        source: "memory_curator",
        delta: "Reviewing durable memory.",
        recordedAt: "2026-06-27T19:24:20.000Z",
      },
    ]),
  },
  {
    id: "turn-1-assistant",
    role: "assistant",
    content: "Use the governed ToolSpec-backed YouTube transcript tool.",
  },
]);

const validationStorage = new MemoryStorage();
await validationStorage.makeDirectory(libraryRoot);
await validationStorage.writeText(
  join(libraryRoot, "quartz-missing-id", "CONVERSATION.toml"),
  [
    `created_at = "2026-06-27T19:24:18.525Z"`,
    `updated_at = "2026-06-27T19:24:18.525Z"`,
    `session_file = "session.jsonl"`,
    "",
  ].join("\n"),
);
await assert.rejects(
  () =>
    readConversation({
      storage: validationStorage,
      libraryRoot,
      folderName: "quartz-missing-id",
      includeMessages: false,
    }),
  /quartz-missing-id\/CONVERSATION\.toml is missing required field: conversation_id/,
);

const missingManifestStorage = new MemoryStorage();
await missingManifestStorage.makeDirectory(join(libraryRoot, "quartz-missing-manifest"));
await assert.rejects(
  () =>
    listConversations({
      storage: missingManifestStorage,
      libraryRoot,
    }),
  /quartz-missing-manifest\/CONVERSATION\.toml is missing from conversation history/,
);

const missingSummaryStorage = new MemoryStorage();
await seedConversation({
  storage: missingSummaryStorage,
  folderName: "quartz-missing-summary",
});
await missingSummaryStorage.makeDirectory(
  join(libraryRoot, "quartz-missing-summary", "turns", "turn-1"),
);
await assert.rejects(
  () =>
    readConversation({
      storage: missingSummaryStorage,
      libraryRoot,
      folderName: "quartz-missing-summary",
      includeMessages: true,
    }),
  /turns\/turn-1\/summary\.md is missing from conversation history/,
);

await seedConversation({
  storage: validationStorage,
  folderName: "quartz-malformed-session",
  turns: [
    {
      turnId: "turn-1",
      startedAt: "2026-06-27T19:24:18.525Z",
      latestUserMessage: "show malformed history",
    },
  ],
});
await validationStorage.writeText(
  join(libraryRoot, "quartz-malformed-session", "session.jsonl"),
  [
    JSON.stringify({
      type: "message",
      role: "assistant",
      providerData: { phase: "final_answer" },
      content: [{ type: "output_text", text: "valid" }],
    }),
    "{ malformed",
    "",
  ].join("\n"),
);
await assert.rejects(
  () =>
    readConversation({
      storage: validationStorage,
      libraryRoot,
      folderName: "quartz-malformed-session",
      includeMessages: true,
    }),
  /session\.jsonl line 2 is malformed JSON/,
);

await seedConversation({
  storage: validationStorage,
  folderName: "quartz-malformed-reasoning",
  turns: [
    {
      turnId: "turn-1",
      startedAt: "2026-06-27T19:24:18.525Z",
      latestUserMessage: "show malformed reasoning",
    },
  ],
});
await validationStorage.writeText(
  join(libraryRoot, "quartz-malformed-reasoning", "turns", "turn-1", "reasoning.jsonl"),
  `${JSON.stringify({
    type: "note",
    source: "main",
    delta: "valid text with unexpected type",
    recordedAt: "2026-06-27T19:24:19.000Z",
  })}\n`,
);
await assert.rejects(
  () =>
    readConversation({
      storage: validationStorage,
      libraryRoot,
      folderName: "quartz-malformed-reasoning",
      includeMessages: true,
    }),
  /reasoning\.jsonl line 1 must be a reasoning_delta record/,
);

await seedConversation({
  storage,
  folderName: "quartz-empty",
});
await seedConversation({
  storage,
  folderName: "quartz-older",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
});
await seedConversation({
  storage,
  folderName: "quartz-recent",
  createdAt: "2026-06-28T00:00:00.000Z",
  updatedAt: "2026-06-28T00:00:00.000Z",
});

const list = await listConversations({ storage, libraryRoot });
assert.deepEqual(
  list.map((item) => item.id),
  ["recent", "thread-alpha", "older", "empty"],
);
assert.equal(list.at(-1)?.title, "New chat");

const deleted = await deleteConversations({ storage, libraryRoot });
assert.equal(deleted, 4);
assert.deepEqual(await listConversations({ storage, libraryRoot }), []);

const createStorage = new MemoryStorage();
await createStorage.makeDirectory(libraryRoot);
const created = await createConversation({ storage: createStorage, libraryRoot });
assert.equal(created.title, "New chat");
assert.deepEqual(created.messages, []);
assert.ok(created.id);
assert.equal(created.conversationId, `quartz-${created.id}`);
assert.ok(created.createdAt);
assert.equal(created.updatedAt, created.createdAt);

const createdToml = await createStorage.readText(
  join(libraryRoot, created.conversationId, "CONVERSATION.toml"),
);
assert.match(createdToml, /^conversation_id = "quartz-[^"]+"$/m);
assert.match(createdToml, /^created_at = "[^"]+"$/m);
assert.match(createdToml, /^updated_at = "[^"]+"$/m);
assert.match(createdToml, /^session_file = "session\.jsonl"$/m);

await assert.rejects(
  () => runtimeStorageFromConfig({}),
  /\.meta-harness\.json runtime\.conversationStorage is required/,
);
await assert.rejects(
  () =>
    runtimeStorageFromConfig({
      runtime: {
        conversationStorage: {
          driverName: "filesystem",
        },
      },
    }),
  /\.meta-harness\.json runtime\.conversationStorage must use postgres, got filesystem/,
);

const originalPostgresUrl = process.env.META_HARNESS_POSTGRES_URL;
try {
  delete process.env.META_HARNESS_POSTGRES_URL;
  await assert.rejects(
    () =>
      runtimeStorageFromConfig({
        runtime: {
          conversationStorage: {
            driverName: "postgres",
          },
        },
      }),
    /Postgres runtime storage requires environment variable: META_HARNESS_POSTGRES_URL/,
  );
} finally {
  if (originalPostgresUrl === undefined) {
    delete process.env.META_HARNESS_POSTGRES_URL;
  } else {
    process.env.META_HARNESS_POSTGRES_URL = originalPostgresUrl;
  }
}

console.log(JSON.stringify({ ok: true, conversations: list.length }, null, 2));
