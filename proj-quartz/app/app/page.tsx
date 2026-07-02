"use client";

import {
  CopilotChat,
  CopilotChatView,
  type CopilotChatReasoningMessageProps,
  type CopilotChatInputProps,
  UseAgentUpdate,
  useAgent,
} from "@copilotkit/react-core/v2";
import type { Message } from "@ag-ui/core";
import {
  BookOpen,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  KeyRound,
  LogOut,
  Mail,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  PenLine,
  Plus,
  Search,
  Settings,
  UserRound,
} from "lucide-react";
import {
  useCallback,
  cloneElement,
  createContext,
  useEffect,
  useId,
  useContext,
  isValidElement,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  reasoningEfforts,
  useModelSelection,
  useReasoningEffort,
  type ReasoningEffort,
} from "./providers";
import { Dialog } from "./components/ui/dialog";
import { LibrariesWorkspace } from "./components/libraries/libraries-workspace";
import { TabPanel, Tabs, type TabItem } from "./components/ui/tabs";

type QuartzChatInputProps = Parameters<
  NonNullable<CopilotChatInputProps["children"]>
>[0];
type QuartzChatViewProps = React.ComponentProps<typeof CopilotChatView>;

type QuartzConversationThread = {
  id: string;
  conversationId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  messagesLoaded: boolean;
};

type QuartzUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string;
};

type QuartzOrganization = {
  id: string;
  name: string;
  actorUri: string;
  role: string;
};

type QuartzAuthSession = {
  user: QuartzUser;
  organizations: QuartzOrganization[];
  activeOrganization: QuartzOrganization | null;
};

type QuartzApiKey = {
  id: string;
  label: string;
  tokenPrefix: string;
  actorScope: "user" | "organization";
  actorUri: string;
  organizationId: string | null;
  createdAt: string;
  lastUsedAt: string | null;
};

type QuartzThreadChatContextValue = {
  activeThreadId: string;
  storedMessages: Message[];
  onMessagesChange: (threadId: string, messages: Message[]) => void;
  onMissingAssistant: (threadId: string, visibleMessages: Message[]) => void;
  onHydratedThread: (threadId: string) => void;
};

type QuartzWorkspace = "chat" | "libraries";

const untitledThreadTitle = "New chat";
const quartzConversationApiPath = "/api/knowledge-agent/conversations";
const quartzApiKeysApiPath = "/api/settings/api-keys";
const conversationFetchOptions: RequestInit = { cache: "no-store" };
const chatRoutePrefix = "/c/";
const maxConversationRefreshAttempts = 48;
const maxConversationRefreshDelayMs = 5_000;
const chatScrollBottomThresholdPx = 80;
const quartzPendingReasoningMarker = "[[quartz-pending]]";
const QuartzComposerDisabledContext = createContext(false);
const QuartzThreadChatContext = createContext<QuartzThreadChatContextValue | null>(null);
const librariesRoutePath = "/libraries";

function nowIso() {
  return new Date().toISOString();
}

function createThreadId() {
  return crypto.randomUUID();
}

function chatPathForThread(threadId: string) {
  return `${chatRoutePrefix}${encodeURIComponent(threadId)}`;
}

function threadIdFromPath(pathname: string) {
  if (pathname === "/" || pathname === "") {
    return null;
  }

  const match = pathname.match(/^\/c\/([^/]+)\/?$/);
  if (!match?.[1]) {
    return null;
  }

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

function currentUrlThreadId() {
  if (typeof window === "undefined") {
    return null;
  }
  return threadIdFromPath(window.location.pathname);
}

function workspaceFromPath(pathname: string): QuartzWorkspace {
  return pathname === librariesRoutePath || pathname.startsWith(`${librariesRoutePath}/`)
    ? "libraries"
    : "chat";
}

function currentUrlWorkspace(): QuartzWorkspace {
  if (typeof window === "undefined") {
    return "chat";
  }
  return workspaceFromPath(window.location.pathname);
}

function updateChatUrl(threadId: string | null, mode: "push" | "replace" = "push") {
  if (typeof window === "undefined") {
    return;
  }

  const nextPath = threadId ? chatPathForThread(threadId) : "/";
  const currentPath = `${window.location.pathname}${window.location.search}`;
  if (currentPath === nextPath) {
    return;
  }

  if (mode === "replace") {
    window.history.replaceState({ threadId }, "", nextPath);
    return;
  }

  window.history.pushState({ threadId }, "", nextPath);
}

function updateLibrariesUrl(mode: "push" | "replace" = "push") {
  if (typeof window === "undefined") {
    return;
  }

  const currentPath = `${window.location.pathname}${window.location.search}`;
  if (currentPath === librariesRoutePath) {
    return;
  }

  if (mode === "replace") {
    window.history.replaceState({ workspace: "libraries" }, "", librariesRoutePath);
    return;
  }

  window.history.pushState({ workspace: "libraries" }, "", librariesRoutePath);
}

function safeThreadIdPart(value: string) {
  return value.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 96) || "thread";
}

function conversationIdFromThreadId(threadId: string) {
  return `quartz-${safeThreadIdPart(threadId)}`;
}

function messageContentText(content: unknown): string {
  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (
          part
          && typeof part === "object"
          && "type" in part
          && part.type === "text"
          && "text" in part
          && typeof part.text === "string"
        ) {
          return part.text.trim();
        }
        return "";
      })
      .filter(Boolean)
      .join(" ")
      .trim();
  }

  return "";
}

function threadTitleFromMessages(messages: Message[]) {
  const firstUserMessage = messages.find((message) => message.role === "user");
  const title = messageContentText(firstUserMessage?.content);
  if (!title) {
    return untitledThreadTitle;
  }

  return title.length > 54 ? `${title.slice(0, 51).trim()}...` : title;
}

function compareThreadsByRecency(
  left: QuartzConversationThread,
  right: QuartzConversationThread,
) {
  if (left.updatedAt && right.updatedAt) {
    return right.updatedAt.localeCompare(left.updatedAt);
  }
  if (left.updatedAt) {
    return -1;
  }
  if (right.updatedAt) {
    return 1;
  }
  return right.conversationId.localeCompare(left.conversationId);
}

function cloneMessages(messages: Message[]): Message[] {
  return JSON.parse(JSON.stringify(messages)) as Message[];
}

function messageFingerprint(messages: Message[]) {
  return JSON.stringify(messages);
}

function messagesMatch(left: Message, right: Message) {
  return (
    left.id === right.id ||
    (
      left.role === right.role &&
      messageContentText(left.content) === messageContentText(right.content)
    )
  );
}

function startsWithStoredMessages(
  liveMessages: Message[],
  storedMessages: Message[],
) {
  if (storedMessages.length === 0) {
    return true;
  }
  if (liveMessages.length < storedMessages.length) {
    return false;
  }

  return storedMessages.every((storedMessage, index) =>
    messagesMatch(liveMessages[index] as Message, storedMessage)
  );
}

function mergeThreadMessages(
  storedMessages: Message[],
  liveMessages: Message[],
) {
  if (storedMessages.length === 0) {
    return cloneMessages(liveMessages);
  }
  if (liveMessages.length === 0) {
    return cloneMessages(storedMessages);
  }
  if (startsWithStoredMessages(liveMessages, storedMessages)) {
    return cloneMessages(liveMessages);
  }

  const merged = cloneMessages(storedMessages);
  for (const liveMessage of liveMessages) {
    const existingById = merged.findIndex((message) => message.id === liveMessage.id);
    if (existingById >= 0) {
      merged[existingById] = cloneMessages([liveMessage])[0] as Message;
      continue;
    }
    if (merged.some((message) => messagesMatch(message, liveMessage))) {
      continue;
    }
    merged.push(cloneMessages([liveMessage])[0] as Message);
  }

  return merged;
}

function mergeMessageSnapshots(...snapshots: Message[][]) {
  return snapshots.reduce<Message[]>(
    (merged, snapshot) => mergeThreadMessages(merged, snapshot),
    [],
  );
}

function reasoningMessages(messages: Message[]) {
  return messages.filter((message) =>
    message.role === "reasoning" && Boolean(messageContentText(message.content))
  );
}

function withReasoningAfterLatestUser(
  messages: Message[],
  reasoning: Message[],
) {
  if (
    reasoning.length === 0 ||
    messages.some((message) => message.role === "reasoning")
  ) {
    return messages;
  }

  const nextMessages = cloneMessages(messages);
  let insertAt = nextMessages.length;
  for (let index = nextMessages.length - 1; index >= 0; index -= 1) {
    if (nextMessages[index]?.role === "user") {
      insertAt = index + 1;
      break;
    }
  }
  nextMessages.splice(insertAt, 0, ...cloneMessages(reasoning));
  return nextMessages;
}

function withPendingAfterLatestUser(
  messages: Message[],
  pending: boolean,
  threadId: string,
) {
  if (!pending || messages.some((message) => message.role === "reasoning")) {
    return messages;
  }

  const latestUserKey = latestUserMessageKey(messages);
  if (!latestUserKey) {
    return messages;
  }

  const nextMessages = cloneMessages(messages);
  let insertAt = nextMessages.length;
  for (let index = nextMessages.length - 1; index >= 0; index -= 1) {
    if (nextMessages[index]?.role === "user") {
      insertAt = index + 1;
      break;
    }
  }
  nextMessages.splice(insertAt, 0, {
    id: `quartz-pending-${threadId}-${latestUserKey}`,
    role: "reasoning",
    content: quartzPendingReasoningMarker,
  } as Message);
  return nextMessages;
}

function latestUserMessageKey(messages: Message[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index] as Message | undefined;
    if (message?.role !== "user") {
      continue;
    }

    const content = messageContentText(message.content);
    return content ? `${message.id}:${content}` : message.id;
  }

  return "";
}

function hasAssistantAfterLatestUser(messages: Message[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index] as Message | undefined;
    if (message?.role === "assistant" && messageContentText(message.content)) {
      return true;
    }
    if (message?.role === "user") {
      return false;
    }
  }

  return true;
}

function delay(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function conversationRefreshDelayMs(attempt: number) {
  return Math.min(maxConversationRefreshDelayMs, 900 + attempt * 350);
}

function isNearChatBottom(scrollElement: HTMLElement) {
  return (
    scrollElement.scrollHeight -
      scrollElement.scrollTop -
      scrollElement.clientHeight
  ) <= chatScrollBottomThresholdPx;
}

function scrollChatToBottom(scrollElement: HTMLElement) {
  scrollElement.scrollTop = Math.max(
    0,
    scrollElement.scrollHeight - scrollElement.clientHeight,
  );
}

function findChatScrollElement(root: HTMLElement | null) {
  if (!root || typeof window === "undefined") {
    return null;
  }

  const candidates = Array.from(
    root.querySelectorAll<HTMLElement>(
      '[data-testid="copilot-chat"], [data-testid="copilot-chat"] *',
    ),
  );

  return candidates.find((candidate) => {
    const style = window.getComputedStyle(candidate);
    const overflowScrolls =
      style.overflowY === "auto" || style.overflowY === "scroll";
    return (
      overflowScrolls &&
      candidate.scrollHeight > candidate.clientHeight + 1
    );
  }) ?? null;
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  let json: unknown = {};
  if (text.trim()) {
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      if (!response.ok) {
        throw new Error(`Conversation request failed with ${response.status}.`);
      }
      throw new Error("Conversation response was malformed.");
    }
  }

  if (!response.ok) {
    const message = json &&
      typeof json === "object" &&
      "error" in json &&
      typeof json.error === "string"
        ? json.error
        : `Conversation request failed with ${response.status}.`;
    throw new Error(message);
  }
  return json;
}

function apiKeysFromApi(value: unknown): QuartzApiKey[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }
  const apiKeys = (value as Record<string, unknown>).apiKeys;
  if (!Array.isArray(apiKeys)) {
    return [];
  }
  return apiKeys.flatMap((apiKey) => {
    if (!apiKey || typeof apiKey !== "object" || Array.isArray(apiKey)) {
      return [];
    }
    const record = apiKey as Record<string, unknown>;
    if (
      typeof record.id !== "string" ||
      typeof record.label !== "string" ||
      typeof record.tokenPrefix !== "string" ||
      (record.actorScope !== "user" && record.actorScope !== "organization") ||
      typeof record.actorUri !== "string" ||
      (record.organizationId !== null && typeof record.organizationId !== "string") ||
      typeof record.createdAt !== "string"
    ) {
      return [];
    }
    return [{
      id: record.id,
      label: record.label,
      tokenPrefix: record.tokenPrefix,
      actorScope: record.actorScope,
      actorUri: record.actorUri,
      organizationId: record.organizationId,
      createdAt: record.createdAt,
      lastUsedAt: typeof record.lastUsedAt === "string" ? record.lastUsedAt : null,
    }];
  });
}

function apiKeyCreationFromApi(value: unknown): { apiKey: QuartzApiKey; token: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("API key response was malformed.");
  }
  const record = value as Record<string, unknown>;
  const apiKeys = apiKeysFromApi({ apiKeys: [record.apiKey] });
  if (apiKeys.length !== 1 || typeof record.token !== "string") {
    throw new Error("API key response was malformed.");
  }
  return {
    apiKey: apiKeys[0] as QuartzApiKey,
    token: record.token,
  };
}

function conversationFromApi(
  value: unknown,
  messagesLoaded: boolean,
): QuartzConversationThread | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== "string" ||
    typeof record.conversationId !== "string" ||
    typeof record.title !== "string" ||
    typeof record.createdAt !== "string" ||
    typeof record.updatedAt !== "string"
  ) {
    return undefined;
  }

  if (record.messages !== undefined && !Array.isArray(record.messages)) {
    return undefined;
  }
  if (messagesLoaded && !Array.isArray(record.messages)) {
    return undefined;
  }

  const messages: Message[] = [];
  for (const message of record.messages ?? []) {
    if (!message || typeof message !== "object" || Array.isArray(message)) {
      return undefined;
    }
    const candidate = message as Record<string, unknown>;
    if (
      typeof candidate.id !== "string" ||
      (
        candidate.role !== "user" &&
        candidate.role !== "assistant" &&
        candidate.role !== "reasoning"
      ) ||
      typeof candidate.content !== "string"
    ) {
      return undefined;
    }
    messages.push(candidate as Message);
  }

  return {
    id: record.id,
    conversationId: record.conversationId,
    title: record.title,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    messages,
    messagesLoaded,
  };
}

function requireConversationFromApi(
  value: unknown,
  messagesLoaded: boolean,
  label: string,
): QuartzConversationThread {
  const conversation = conversationFromApi(value, messagesLoaded);
  if (!conversation) {
    throw new Error(`${label} was malformed.`);
  }
  return conversation;
}

async function fetchConversationList(): Promise<QuartzConversationThread[]> {
  const json = await parseJsonResponse(
    await fetch(quartzConversationApiPath, conversationFetchOptions),
  );
  if (!json || typeof json !== "object" || !("conversations" in json)) {
    throw new Error("Conversation list response was malformed.");
  }

  if (!Array.isArray(json.conversations)) {
    throw new Error("Conversation list response was malformed.");
  }

  return json.conversations.map((conversation) =>
    requireConversationFromApi(
      conversation,
      false,
      "Conversation list item",
    ),
  );
}

async function fetchConversation(threadId: string): Promise<QuartzConversationThread> {
  const json = await parseJsonResponse(
    await fetch(
      `${quartzConversationApiPath}?threadId=${encodeURIComponent(threadId)}`,
      conversationFetchOptions,
    ),
  );
  if (!json || typeof json !== "object" || !("conversation" in json)) {
    throw new Error("Conversation response was malformed.");
  }

  return requireConversationFromApi(
    json.conversation,
    true,
    "Conversation response",
  );
}

function authSessionFromApi(value: unknown): QuartzAuthSession | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const session = record.session;
  if (!session || typeof session !== "object" || Array.isArray(session)) {
    return null;
  }
  const candidate = session as Record<string, unknown>;
  const user = candidate.user;
  const organizations = candidate.organizations;
  if (!user || typeof user !== "object" || Array.isArray(user) || !Array.isArray(organizations)) {
    return null;
  }
  const userRecord = user as Record<string, unknown>;
  if (
    typeof userRecord.id !== "string" ||
    typeof userRecord.email !== "string" ||
    typeof userRecord.displayName !== "string" ||
    typeof userRecord.avatarUrl !== "string"
  ) {
    return null;
  }
  const parsedOrganizations = organizations.flatMap((organization) => {
    if (!organization || typeof organization !== "object" || Array.isArray(organization)) {
      return [];
    }
    const organizationRecord = organization as Record<string, unknown>;
    if (
      typeof organizationRecord.id !== "string" ||
      typeof organizationRecord.name !== "string" ||
      typeof organizationRecord.actorUri !== "string" ||
      typeof organizationRecord.role !== "string"
    ) {
      return [];
    }
    return [{
      id: organizationRecord.id,
      name: organizationRecord.name,
      actorUri: organizationRecord.actorUri,
      role: organizationRecord.role,
    }];
  });
  const activeOrganization = candidate.activeOrganization &&
    typeof candidate.activeOrganization === "object" &&
    !Array.isArray(candidate.activeOrganization)
      ? parsedOrganizations.find((organization) =>
          organization.id ===
            (candidate.activeOrganization as Record<string, unknown>).id
        ) ?? null
      : null;
  return {
    user: {
      id: userRecord.id,
      email: userRecord.email,
      displayName: userRecord.displayName,
      avatarUrl: userRecord.avatarUrl,
    },
    organizations: parsedOrganizations,
    activeOrganization,
  };
}

async function fetchAuthSession(): Promise<QuartzAuthSession | null> {
  return authSessionFromApi(
    await parseJsonResponse(
      await fetch("/api/auth/session", conversationFetchOptions),
    ),
  );
}

function reasoningEffortLabel(reasoningEffort: ReasoningEffort) {
  if (reasoningEffort === "xhigh") {
    return "Extra High";
  }

  return reasoningEffort
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatReasoningDuration(seconds: number) {
  const rounded = Math.max(0, Math.round(seconds));
  if (rounded < 1) {
    return "a moment";
  }
  if (rounded === 1) {
    return "1 second";
  }

  return `${rounded} seconds`;
}

function streamSourceLabel(source: string) {
  if (source === "main") {
    return "Knowledge Agent";
  }
  if (source === "memory_curator") {
    return "Memory Curator";
  }

  const words = source
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return words.length > 0
    ? words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")
    : "Agent";
}

function visibleReasoningContent(content: string) {
  return content
    .replace(/\n*\[\[quartz-complete]]\n*/g, "")
    .replace(quartzPendingReasoningMarker, "");
}

function reasoningSections(content: string) {
  const sections: Array<{ source: string; text: string }> = [];
  const markerPattern = /\n*\[\[quartz-source:([^\]]+)]]\n*/g;
  let currentSource = "main";
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = markerPattern.exec(content)) !== null) {
    const text = content.slice(cursor, match.index);
    if (text.trim()) {
      sections.push({ source: currentSource, text });
    }
    currentSource = match[1] ?? "main";
    cursor = markerPattern.lastIndex;
  }

  const remainder = content.slice(cursor);
  if (remainder.trim()) {
    sections.push({ source: currentSource, text: remainder });
  }

  return sections;
}

type QuartzSelectorOption = {
  id: string;
  label: string;
};

function QuartzComposerSelector({
  value,
  options,
  defaultLabel,
  menuLabel,
  disabled = false,
  onSelect,
}: {
  value: string | null;
  options: QuartzSelectorOption[];
  defaultLabel: string;
  menuLabel: string;
  disabled?: boolean;
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const controlRef = useRef<HTMLDivElement | null>(null);
  const selectedOption = options.find((option) => option.id === value);
  const label = selectedOption?.label ?? defaultLabel;

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!controlRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="quartz-selector-control" ref={controlRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className="quartz-selector-trigger"
        disabled={disabled || options.length === 0}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{label}</span>
        <ChevronDown aria-hidden="true" size={14} strokeWidth={2.2} />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={menuLabel}
          className="quartz-selector-menu"
        >
          {options.map((option) => {
            const selected = option.id === value;
            return (
              <button
                key={option.id}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                className="quartz-selector-option"
                onClick={() => {
                  onSelect(option.id);
                  setOpen(false);
                }}
              >
                <span>{option.label}</span>
                {selected ? (
                  <Check aria-hidden="true" size={14} strokeWidth={2.4} />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function QuartzModelControl() {
  const { modelOptions, selectedModel, setSelectedModel } = useModelSelection();

  return (
    <QuartzComposerSelector
      value={selectedModel}
      options={modelOptions}
      defaultLabel="Model"
      menuLabel="Model"
      disabled={modelOptions.length === 0}
      onSelect={setSelectedModel}
    />
  );
}

function QuartzReasoningControl() {
  const { reasoningEffort, setReasoningEffort } = useReasoningEffort();
  const options = reasoningEfforts.map((effort) => ({
    id: effort,
    label: reasoningEffortLabel(effort),
  }));

  return (
    <QuartzComposerSelector
      value={reasoningEffort}
      options={options}
      defaultLabel="Reasoning"
      menuLabel="Reasoning effort"
      onSelect={(effort) => setReasoningEffort(effort as ReasoningEffort)}
    />
  );
}

function disabledControl(
  control: React.ReactNode,
  disabled: boolean,
): React.ReactNode {
  if (!disabled || !isValidElement(control)) {
    return control;
  }

  return cloneElement(control, {
    disabled: true,
    "aria-disabled": true,
  } as Partial<React.ComponentProps<"button"> & React.ComponentProps<"textarea">>);
}

function QuartzChatInput({
  textArea,
  addMenuButton,
  startTranscribeButton,
  cancelTranscribeButton,
  finishTranscribeButton,
  sendButton,
  audioRecorder,
  disclaimer,
  mode,
  showDisclaimer,
}: QuartzChatInputProps) {
  const composerDisabled = useContext(QuartzComposerDisabledContext);
  const { agent } = useAgent({
    agentId: "knowledge-agent",
    updates: [UseAgentUpdate.OnRunStatusChanged],
  });
  const runInProgress = agent.isRunning || composerDisabled;

  return (
    <div className="quartz-composer-shell">
      {audioRecorder}
      <div className="quartz-composer">
        <div className="quartz-composer-add">
          {disabledControl(addMenuButton, runInProgress)}
        </div>
        <div className="quartz-composer-input">
          {disabledControl(textArea, runInProgress)}
        </div>
        <div className="quartz-composer-actions">
          {mode === "transcribe" ? (
            <>
              {disabledControl(cancelTranscribeButton, runInProgress)}
              {disabledControl(finishTranscribeButton, runInProgress)}
            </>
          ) : (
            <>
              <QuartzModelControl />
              <QuartzReasoningControl />
              {disabledControl(startTranscribeButton, runInProgress)}
              {disabledControl(sendButton, runInProgress)}
            </>
          )}
        </div>
      </div>
      {showDisclaimer ? (
        <div className="quartz-composer-disclaimer">{disclaimer}</div>
      ) : null}
    </div>
  );
}

type QuartzReasoningMessageProps = Parameters<
  NonNullable<CopilotChatReasoningMessageProps["children"]>
>[0];

function QuartzReasoningMessage({
  message,
  isRunning = false,
}: QuartzReasoningMessageProps) {
  const [open, setOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const detailsId = useId();
  const isPending = message.content.includes(quartzPendingReasoningMarker);
  const displayContent = visibleReasoningContent(message.content);
  const isComplete = message.content.includes("[[quartz-complete]]");
  const isStreaming = isRunning && !isComplete;
  const hasContent = displayContent.trim().length > 0;
  const sections = reasoningSections(displayContent);

  useEffect(() => {
    if (isStreaming && startTimeRef.current === null) {
      startTimeRef.current = Date.now();
    }

    if (!isStreaming && startTimeRef.current !== null) {
      setElapsed((Date.now() - startTimeRef.current) / 1000);
      return;
    }

    if (!isStreaming) {
      return;
    }

    const timer = window.setInterval(() => {
      if (startTimeRef.current !== null) {
        setElapsed((Date.now() - startTimeRef.current) / 1000);
      }
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [isStreaming]);

  const label = isStreaming
    ? "Quartz thinking"
    : `Thought for ${formatReasoningDuration(elapsed)}`;

  if (isPending) {
    return (
      <div
        className="quartz-reasoning-message quartz-reasoning-pending"
        data-message-id={message.id}
        data-state="pending"
        role="status"
        aria-label="Waiting for response"
      >
        <span className="quartz-reasoning-dot" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div
      className="quartz-reasoning-message"
      data-message-id={message.id}
      data-state={isStreaming ? "running" : "complete"}
    >
      <button
        type="button"
        className="quartz-reasoning-trigger"
        aria-expanded={hasContent ? open : undefined}
        aria-controls={hasContent ? detailsId : undefined}
        disabled={!hasContent}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="quartz-reasoning-dot" aria-hidden="true" />
        <span>{label}</span>
        {hasContent ? (
          <ChevronRight
            aria-hidden="true"
            className={open ? "quartz-reasoning-icon is-open" : "quartz-reasoning-icon"}
            size={14}
            strokeWidth={2.2}
          />
        ) : null}
      </button>
      {hasContent && open ? (
        <div id={detailsId} className="quartz-reasoning-detail">
          {sections.map((section, index) => (
            <section className="quartz-reasoning-section" key={`${section.source}-${index}`}>
              <div className="quartz-reasoning-source">
                {streamSourceLabel(section.source)}
              </div>
              <div>{section.text.trim()}</div>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function QuartzPersistentChatView({
  activeThreadId,
  storedMessages,
  onMessagesChange,
  onMissingAssistant,
  onHydratedThread,
  ...props
}: QuartzChatViewProps & {
  activeThreadId: string;
  storedMessages: Message[];
  onMessagesChange: (threadId: string, messages: Message[]) => void;
  onMissingAssistant: (threadId: string, visibleMessages: Message[]) => void;
  onHydratedThread: (threadId: string) => void;
}) {
  const { agent } = useAgent({
    agentId: "knowledge-agent",
    updates: [
      UseAgentUpdate.OnMessagesChanged,
      UseAgentUpdate.OnRunStatusChanged,
    ],
  });
  const hydratedThreadRef = useRef<string | null>(null);
  const hydrationPendingRef = useRef(false);
  const reasoningThreadRef = useRef<string | null>(null);
  const latestReasoningRef = useRef<Message[]>([]);
  const scrollRootRef = useRef<HTMLDivElement | null>(null);
  const scrollStateRef = useRef<{
    threadId: string;
    latestUserKey: string;
    fingerprint: string;
    scrollTop: number;
    scrollHeight: number;
    clientHeight: number;
    pinned: boolean;
  } | null>(null);
  const pinnedToBottomRef = useRef(true);
  const displayedFingerprintRef = useRef("");
  const displayedLatestUserKeyRef = useRef("");
  const storedFingerprint = useMemo(
    () => messageFingerprint(storedMessages),
    [storedMessages],
  );
  const liveMessages = props.messages as Message[];
  const liveFingerprint = useMemo(
    () => messageFingerprint(liveMessages),
    [liveMessages],
  );
  const agentFingerprint = useMemo(
    () => messageFingerprint(agent.messages as Message[]),
    [agent.messages],
  );
  const liveIncludesStored = useMemo(
    () => startsWithStoredMessages(liveMessages, storedMessages),
    [liveMessages, storedMessages],
  );
  const mergedMessages = useMemo(
    () => mergeThreadMessages(storedMessages, liveMessages),
    [storedMessages, liveMessages],
  );
  const liveReasoningMessages = useMemo(
    () => reasoningMessages(mergedMessages),
    [mergedMessages],
  );
  const missingAssistantKey = useMemo(
    () =>
      hasAssistantAfterLatestUser(mergedMessages)
        ? ""
        : latestUserMessageKey(mergedMessages),
    [mergedMessages],
  );
  const hydratingThread =
    hydratedThreadRef.current !== activeThreadId || hydrationPendingRef.current;
  const baseDisplayedMessages =
    !agent.isRunning && hydratingThread
      ? storedMessages
      : mergedMessages;
  const displayedMessagesWithReasoning = withReasoningAfterLatestUser(
    baseDisplayedMessages,
    reasoningThreadRef.current === activeThreadId
      ? latestReasoningRef.current
      : [],
  );
  const displayedMessages = withPendingAfterLatestUser(
    displayedMessagesWithReasoning,
    agent.isRunning && !hasAssistantAfterLatestUser(displayedMessagesWithReasoning),
    activeThreadId,
  );
  const displayedFingerprint = useMemo(
    () => messageFingerprint(displayedMessages),
    [displayedMessages],
  );
  const displayedLatestUserKey = useMemo(
    () => latestUserMessageKey(displayedMessages),
    [displayedMessages],
  );
  displayedFingerprintRef.current = displayedFingerprint;
  displayedLatestUserKeyRef.current = displayedLatestUserKey;
  const missingAssistantRefreshRef = useRef("");

  useEffect(() => {
    let cancelled = false;
    let cleanupScroll: (() => void) | undefined;
    let animationFrame: number | undefined;

    function rememberScrollPosition(scrollElement: HTMLElement) {
      const pinned = isNearChatBottom(scrollElement);
      pinnedToBottomRef.current = pinned;
      scrollStateRef.current = {
        threadId: activeThreadId,
        latestUserKey: displayedLatestUserKeyRef.current,
        fingerprint: displayedFingerprintRef.current,
        scrollTop: scrollElement.scrollTop,
        scrollHeight: scrollElement.scrollHeight,
        clientHeight: scrollElement.clientHeight,
        pinned,
      };
    }

    function bindScrollElement() {
      if (cancelled) {
        return;
      }

      const scrollElement = findChatScrollElement(scrollRootRef.current);
      if (!scrollElement) {
        animationFrame = window.requestAnimationFrame(bindScrollElement);
        return;
      }

      const handleScroll = () => rememberScrollPosition(scrollElement);
      scrollElement.addEventListener("scroll", handleScroll, { passive: true });
      cleanupScroll = () => scrollElement.removeEventListener("scroll", handleScroll);
      rememberScrollPosition(scrollElement);
    }

    bindScrollElement();

    return () => {
      cancelled = true;
      if (animationFrame !== undefined) {
        window.cancelAnimationFrame(animationFrame);
      }
      cleanupScroll?.();
    };
  }, [activeThreadId, displayedFingerprint]);

  useLayoutEffect(() => {
    const scrollElement = findChatScrollElement(scrollRootRef.current);
    if (!scrollElement) {
      return;
    }

    const previous = scrollStateRef.current;
    const threadChanged = previous?.threadId !== activeThreadId;
    const latestUserChanged = Boolean(
      previous &&
        previous.threadId === activeThreadId &&
        displayedLatestUserKey &&
        displayedLatestUserKey !== previous.latestUserKey,
    );
    const shouldScrollToBottom =
      !previous || threadChanged || latestUserChanged || previous.pinned;

    if (shouldScrollToBottom) {
      scrollChatToBottom(scrollElement);
    } else if (
      previous.threadId === activeThreadId &&
      scrollElement.scrollTop <= 1 &&
      previous.scrollTop > 1
    ) {
      scrollElement.scrollTop = Math.min(
        previous.scrollTop,
        Math.max(0, scrollElement.scrollHeight - scrollElement.clientHeight),
      );
    }

    function rememberScrollPosition(target: HTMLElement) {
      const pinned = isNearChatBottom(target);
      pinnedToBottomRef.current = pinned;
      scrollStateRef.current = {
        threadId: activeThreadId,
        latestUserKey: displayedLatestUserKey,
        fingerprint: displayedFingerprint,
        scrollTop: target.scrollTop,
        scrollHeight: target.scrollHeight,
        clientHeight: target.clientHeight,
        pinned,
      };
    }

    rememberScrollPosition(scrollElement);

    if (!shouldScrollToBottom) {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      const currentScrollElement =
        findChatScrollElement(scrollRootRef.current) ?? scrollElement;
      if (
        threadChanged ||
        latestUserChanged ||
        pinnedToBottomRef.current
      ) {
        scrollChatToBottom(currentScrollElement);
      }
      rememberScrollPosition(currentScrollElement);
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [
    activeThreadId,
    displayedFingerprint,
    displayedLatestUserKey,
  ]);

  useEffect(() => {
    if (reasoningThreadRef.current !== activeThreadId) {
      reasoningThreadRef.current = activeThreadId;
      latestReasoningRef.current = [];
    }
    if (liveReasoningMessages.length > 0) {
      latestReasoningRef.current = cloneMessages(liveReasoningMessages);
    }
  }, [activeThreadId, liveReasoningMessages]);

  useEffect(() => {
    if (!activeThreadId || agent.isRunning) {
      return;
    }

    if (hydratedThreadRef.current !== activeThreadId) {
      hydratedThreadRef.current = activeThreadId;
      hydrationPendingRef.current = true;
      if (agentFingerprint !== storedFingerprint) {
        agent.setMessages(cloneMessages(storedMessages));
        if (storedMessages.length === 0) {
          hydrationPendingRef.current = false;
          onHydratedThread(activeThreadId);
        }
        return;
      }
    }

    if (
      hydrationPendingRef.current &&
      agentFingerprint === storedFingerprint
    ) {
      hydrationPendingRef.current = false;
    }

    if (
      storedMessages.length > 0 &&
      !liveIncludesStored &&
      !agent.isRunning
    ) {
      const nextMessages = mergeMessageSnapshots(storedMessages, liveMessages);
      hydrationPendingRef.current = true;
      if (messageFingerprint(nextMessages) !== liveFingerprint) {
        agent.setMessages(nextMessages);
        return;
      }
      hydrationPendingRef.current = false;
      return;
    }

    if (!hydrationPendingRef.current) {
      onHydratedThread(activeThreadId);
    }
  }, [
    activeThreadId,
    agent,
    agentFingerprint,
    liveFingerprint,
    liveIncludesStored,
    liveMessages,
    onHydratedThread,
    storedFingerprint,
    storedMessages,
  ]);

  useEffect(() => {
    if (!activeThreadId || hydratedThreadRef.current !== activeThreadId) {
      return;
    }

    if (hydrationPendingRef.current) {
      if (liveFingerprint !== storedFingerprint) {
        if (!agent.isRunning) {
          return;
        }
        hydrationPendingRef.current = false;
      } else {
        hydrationPendingRef.current = false;
      }
    }

    if (
      storedMessages.length > 0 &&
      !liveIncludesStored &&
      !agent.isRunning &&
      hydrationPendingRef.current
    ) {
      return;
    }

    onMessagesChange(activeThreadId, mergedMessages);
  }, [
    activeThreadId,
    agent.isRunning,
    liveFingerprint,
    liveIncludesStored,
    mergedMessages,
    onMessagesChange,
    storedFingerprint,
    storedMessages.length,
  ]);

  useEffect(() => {
    if (!activeThreadId || agent.isRunning || !missingAssistantKey) {
      return;
    }

    const refreshKey = `${activeThreadId}:${missingAssistantKey}`;
    if (missingAssistantRefreshRef.current === refreshKey) {
      return;
    }
    missingAssistantRefreshRef.current = refreshKey;

    const timeout = window.setTimeout(() => {
      onMissingAssistant(activeThreadId, mergedMessages);
    }, 1500);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    activeThreadId,
    agent.isRunning,
    mergedMessages,
    missingAssistantKey,
    onMissingAssistant,
  ]);

  return (
    <div className="quartz-chat-scroll-root" ref={scrollRootRef}>
      <CopilotChatView {...props} messages={displayedMessages} />
    </div>
  );
}

const QuartzThreadChatView = Object.assign(
  function QuartzThreadChatView(props: QuartzChatViewProps) {
    const context = useContext(QuartzThreadChatContext);
    if (!context) {
      return <CopilotChatView {...props} />;
    }

    return (
      <QuartzPersistentChatView
        {...props}
        activeThreadId={context.activeThreadId}
        storedMessages={context.storedMessages}
        onMessagesChange={context.onMessagesChange}
        onMissingAssistant={context.onMissingAssistant}
        onHydratedThread={context.onHydratedThread}
      />
    );
  },
  CopilotChatView,
);

function accountInitial(session: QuartzAuthSession | null) {
  const source = session?.user.displayName || session?.user.email || "Q";
  return source.trim().charAt(0).toUpperCase() || "Q";
}

type OrganizationSettingsTab = "manage" | "create";
type SettingsSection = "organizations" | "api-keys";
type ApiKeyActorValue = "user" | `organization:${string}`;

const organizationSettingsTabs: TabItem<OrganizationSettingsTab>[] = [
  { id: "manage", label: "Manage" },
  { id: "create", label: "Create" },
];

// Harness-Requirement: proj-quartz.organization-settings-dialog
// Harness-Requirement: proj-quartz.organization-invite-flow
// Harness-Requirement: proj-quartz.api.key-settings-dialog
// Harness-Requirement: proj-quartz.api.key-actor-scope
function QuartzOrganizationSettingsDialog({
  open,
  session,
  status,
  error,
  busy,
  onOpenChange,
  onCreateOrganization,
  onSwitchOrganization,
  onInvite,
  runAction,
}: {
  open: boolean;
  session: QuartzAuthSession;
  status: string;
  error: string;
  busy: string;
  onOpenChange: (open: boolean) => void;
  onCreateOrganization: (name: string) => Promise<void>;
  onSwitchOrganization: (organizationId: string) => Promise<void>;
  onInvite: (organizationId: string, email: string) => Promise<void>;
  runAction: (label: string, action: () => Promise<void>) => Promise<void>;
}) {
  const activeOrganization = session.activeOrganization;
  const [section, setSection] = useState<SettingsSection>("organizations");
  const [tab, setTab] = useState<OrganizationSettingsTab>(
    activeOrganization ? "manage" : "create",
  );
  const [organizationName, setOrganizationName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [apiKeys, setApiKeys] = useState<QuartzApiKey[]>([]);
  const [apiKeysLoaded, setApiKeysLoaded] = useState(false);
  const [apiKeyLabel, setApiKeyLabel] = useState("");
  const [apiKeyActorValue, setApiKeyActorValue] =
    useState<ApiKeyActorValue>("user");
  const [createdApiKeyToken, setCreatedApiKeyToken] = useState("");
  const [apiKeyError, setApiKeyError] = useState("");
  const canInvite = activeOrganization?.role === "admin";
  const adminOrganizations = useMemo(
    () => session.organizations.filter((organization) => organization.role === "admin"),
    [session.organizations],
  );
  const selectedApiKeyOrganizationId =
    apiKeyActorValue.startsWith("organization:")
      ? apiKeyActorValue.slice("organization:".length)
      : "";

  const refreshApiKeys = useCallback(async () => {
    setApiKeyError("");
    const json = await parseJsonResponse(
      await fetch(quartzApiKeysApiPath, { cache: "no-store" }),
    );
    setApiKeys(apiKeysFromApi(json));
    setApiKeysLoaded(true);
  }, []);

  useEffect(() => {
    if (open && !activeOrganization) {
      setTab("create");
    }
  }, [activeOrganization, open]);

  useEffect(() => {
    if (!open || section !== "api-keys" || apiKeysLoaded) {
      return;
    }
    void refreshApiKeys().catch(() => {
      setApiKeysLoaded(true);
      setApiKeyError("API key listing failed.");
    });
  }, [apiKeysLoaded, open, refreshApiKeys, section]);

  useEffect(() => {
    if (
      apiKeyActorValue !== "user" &&
      !adminOrganizations.some((organization) =>
        apiKeyActorValue === `organization:${organization.id}`,
      )
    ) {
      setApiKeyActorValue("user");
    }
  }, [adminOrganizations, apiKeyActorValue]);

  const settingsError = error || apiKeyError;

  return (
    <Dialog
      open={open}
      title="Settings"
      description="Manage this Quartz account."
      onOpenChange={onOpenChange}
    >
      <div className="quartz-settings-layout">
        <nav className="quartz-settings-nav" aria-label="Settings sections">
          <button
            type="button"
            className={section === "organizations" ? "is-active" : ""}
            onClick={() => setSection("organizations")}
          >
            <Building2 aria-hidden="true" size={16} strokeWidth={1.9} />
            <span>Organizations</span>
          </button>
          <button
            type="button"
            className={section === "api-keys" ? "is-active" : ""}
            onClick={() => setSection("api-keys")}
          >
            <KeyRound aria-hidden="true" size={16} strokeWidth={1.9} />
            <span>API keys</span>
          </button>
        </nav>

        <section className="quartz-settings-content">
          <div className="quartz-settings-title-row">
            <div>
              <h3>{section === "organizations" ? "Organizations" : "API keys"}</h3>
              <p>{session.user.email}</p>
            </div>
          </div>

          {section === "organizations" ? (
            <>
              <Tabs
                items={organizationSettingsTabs}
                value={tab}
                ariaLabel="Organization settings"
                onValueChange={setTab}
              />

              <TabPanel value="manage" activeValue={tab}>
                <section className="quartz-settings-section">
                  <div className="quartz-settings-section-heading">
                    <h4>Current organization</h4>
                  </div>
                  {activeOrganization ? (
                    <div className="quartz-current-organization">
                      <Building2 aria-hidden="true" size={17} strokeWidth={1.9} />
                      <div>
                        <strong>{activeOrganization.name}</strong>
                        <span>{activeOrganization.role}</span>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="quartz-settings-text-button"
                      onClick={() => setTab("create")}
                    >
                      Create organization
                    </button>
                  )}
                </section>

                <section className="quartz-settings-section">
                  <div className="quartz-settings-section-heading">
                    <h4>Memberships</h4>
                  </div>
                  <div className="quartz-organization-list">
                    {session.organizations.map((organization) => {
                      const active = organization.id === activeOrganization?.id;
                      return (
                        <button
                          key={organization.id}
                          type="button"
                          className={
                            active
                              ? "quartz-organization-list-row is-active"
                              : "quartz-organization-list-row"
                          }
                          onClick={() => runAction(
                            "switch",
                            () => onSwitchOrganization(organization.id),
                          )}
                          disabled={Boolean(busy) || active}
                        >
                          <Building2 aria-hidden="true" size={16} strokeWidth={1.9} />
                          <span>{organization.name}</span>
                          {active ? <Check aria-hidden="true" size={15} strokeWidth={1.9} /> : null}
                        </button>
                      );
                    })}
                  </div>
                </section>

                {canInvite && activeOrganization ? (
                  <section className="quartz-settings-section">
                    <div className="quartz-settings-section-heading">
                      <h4>Invite by email</h4>
                    </div>
                    <form
                      className="quartz-settings-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void runAction("invite", async () => {
                          await onInvite(activeOrganization.id, inviteEmail);
                          setInviteEmail("");
                        });
                      }}
                    >
                      <input
                        value={inviteEmail}
                        onChange={(event) => setInviteEmail(event.target.value)}
                        placeholder="name@example.com"
                        aria-label="Invite email"
                      />
                      <button type="submit" disabled={Boolean(busy) || !inviteEmail.trim()}>
                        <Mail aria-hidden="true" size={15} strokeWidth={1.9} />
                        <span>Invite</span>
                      </button>
                    </form>
                  </section>
                ) : null}
              </TabPanel>

              <TabPanel value="create" activeValue={tab}>
                <section className="quartz-settings-section">
                  <div className="quartz-settings-section-heading">
                    <h4>Create organization</h4>
                  </div>
                  <form
                    className="quartz-settings-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void runAction("create", async () => {
                        await onCreateOrganization(organizationName);
                        setOrganizationName("");
                        setTab("manage");
                      });
                    }}
                  >
                    <input
                      value={organizationName}
                      onChange={(event) => setOrganizationName(event.target.value)}
                      placeholder="Organization name"
                      aria-label="Organization name"
                    />
                    <button type="submit" disabled={Boolean(busy) || !organizationName.trim()}>
                      <Plus aria-hidden="true" size={15} strokeWidth={1.9} />
                      <span>Create</span>
                    </button>
                  </form>
                </section>
              </TabPanel>
            </>
          ) : (
            <div className="quartz-tab-panel">
              <section className="quartz-settings-section">
                <div className="quartz-settings-section-heading">
                  <h4>New key</h4>
                </div>
                <form
                  className="quartz-settings-form quartz-api-key-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void runAction("api-key", async () => {
                      const actorScope = apiKeyActorValue === "user" ? "user" : "organization";
                      const json = await parseJsonResponse(
                        await fetch(quartzApiKeysApiPath, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            label: apiKeyLabel,
                            actorScope,
                            organizationId:
                              actorScope === "organization"
                                ? selectedApiKeyOrganizationId
                                : undefined,
                          }),
                        }),
                      );
                      const created = apiKeyCreationFromApi(json);
                      setCreatedApiKeyToken(created.token);
                      setApiKeyLabel("");
                      setApiKeysLoaded(false);
                      await refreshApiKeys();
                    });
                  }}
                >
                  <input
                    value={apiKeyLabel}
                    onChange={(event) => setApiKeyLabel(event.target.value)}
                    placeholder="Key label"
                    aria-label="API key label"
                  />
                  <select
                    value={apiKeyActorValue}
                    onChange={(event) =>
                      setApiKeyActorValue(event.target.value as ApiKeyActorValue)
                    }
                    aria-label="API key actor"
                  >
                    <option value="user">User actor</option>
                    {adminOrganizations.map((organization) => (
                      <option key={organization.id} value={`organization:${organization.id}`}>
                        {organization.name}
                      </option>
                    ))}
                  </select>
                  <button type="submit" disabled={Boolean(busy) || !apiKeyLabel.trim()}>
                    <KeyRound aria-hidden="true" size={15} strokeWidth={1.9} />
                    <span>Create</span>
                  </button>
                </form>
                {createdApiKeyToken ? (
                  <input
                    className="quartz-api-key-token"
                    value={createdApiKeyToken}
                    readOnly
                    aria-label="Created API key"
                    onFocus={(event) => event.currentTarget.select()}
                  />
                ) : null}
              </section>

              <section className="quartz-settings-section">
                <div className="quartz-settings-section-heading">
                  <h4>Existing keys</h4>
                </div>
                <div className="quartz-api-key-list">
                  {apiKeys.map((apiKey) => (
                    <div className="quartz-api-key-row" key={apiKey.id}>
                      <KeyRound aria-hidden="true" size={15} strokeWidth={1.9} />
                      <div>
                        <strong>{apiKey.label}</strong>
                        <span>{apiKey.tokenPrefix} · {apiKey.actorScope}</span>
                      </div>
                    </div>
                  ))}
                  {apiKeysLoaded && apiKeys.length === 0 ? (
                    <div className="quartz-api-key-row">
                      <KeyRound aria-hidden="true" size={15} strokeWidth={1.9} />
                      <div>
                        <strong>No keys</strong>
                        <span>{session.user.email}</span>
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>
            </div>
          )}

          {status || settingsError ? (
            <div className="quartz-settings-status" role="status">
              {settingsError || status}
            </div>
          ) : null}
        </section>
      </div>
    </Dialog>
  );
}

function QuartzAccountMenu({
  session,
  loading,
  status,
  onSignIn,
  onLogout,
  onCreateOrganization,
  onSwitchOrganization,
  onInvite,
}: {
  session: QuartzAuthSession | null;
  loading: boolean;
  status: string;
  onSignIn: () => void;
  onLogout: () => Promise<void>;
  onCreateOrganization: (name: string) => Promise<void>;
  onSwitchOrganization: (organizationId: string) => Promise<void>;
  onInvite: (organizationId: string, email: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const [menuError, setMenuError] = useState("");
  const activeOrganization = session?.activeOrganization ?? null;

  const runAction = useCallback(async (
    label: string,
    action: () => Promise<void>,
  ) => {
    setBusy(label);
    setMenuError("");
    try {
      await action();
    } catch (error) {
      setMenuError(error instanceof Error ? error.message : "Account action failed.");
    } finally {
      setBusy("");
    }
  }, []);

  if (!session) {
    return (
      <div className="quartz-sidebar-footer">
        <button
          type="button"
          className="quartz-account-trigger"
          onClick={onSignIn}
          disabled={loading}
        >
          <div className="quartz-sidebar-avatar" aria-hidden="true">
            <UserRound aria-hidden="true" size={15} strokeWidth={1.9} />
          </div>
          <div className="quartz-account-label">
            <strong>{loading ? "Loading" : "Sign in"}</strong>
            <span>Continue with Google</span>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="quartz-sidebar-footer">
      {open ? (
        <div className="quartz-account-menu" role="menu">
          <div className="quartz-account-menu-header">
            <div className="quartz-sidebar-avatar" aria-hidden="true">
              {accountInitial(session)}
            </div>
            <div>
              <strong>{session.user.displayName || session.user.email}</strong>
              <span>{session.user.email}</span>
            </div>
          </div>

          <div className="quartz-account-menu-section">
            <div className="quartz-account-menu-heading">Organizations</div>
            {session.organizations.length ? (
              session.organizations.map((organization) => {
                const active = organization.id === activeOrganization?.id;
                return (
                  <button
                    key={organization.id}
                    type="button"
                    className={
                      active
                        ? "quartz-account-menu-row is-active"
                        : "quartz-account-menu-row"
                    }
                    onClick={() => runAction(
                      "switch",
                      () => onSwitchOrganization(organization.id),
                    )}
                    disabled={Boolean(busy) || active}
                  >
                    <Building2 aria-hidden="true" size={16} strokeWidth={1.9} />
                    <span>{organization.name}</span>
                    {active ? <Check aria-hidden="true" size={15} strokeWidth={1.9} /> : null}
                  </button>
                );
              })
            ) : (
              <button
                type="button"
                className="quartz-account-menu-row"
                onClick={() => {
                  setOpen(false);
                  setSettingsOpen(true);
                }}
              >
                <Building2 aria-hidden="true" size={16} strokeWidth={1.9} />
                <span>Organizations</span>
                <ChevronRight aria-hidden="true" size={15} strokeWidth={1.9} />
              </button>
            )}
          </div>

          <div className="quartz-account-menu-section">
            <button
              type="button"
              className="quartz-account-menu-row"
              onClick={() => {
                setOpen(false);
                setSettingsOpen(true);
              }}
            >
              <Settings aria-hidden="true" size={16} strokeWidth={1.9} />
              <span>Settings</span>
              <ChevronRight aria-hidden="true" size={15} strokeWidth={1.9} />
            </button>
          </div>

          {status || menuError ? (
            <div className="quartz-account-menu-status" role="status">
              {menuError || status}
            </div>
          ) : null}

          <button
            type="button"
            className="quartz-account-menu-row"
            onClick={() => runAction("logout", onLogout)}
            disabled={Boolean(busy)}
          >
            <LogOut aria-hidden="true" size={16} strokeWidth={1.9} />
            <span>Log out</span>
          </button>
        </div>
      ) : null}

      <button
        type="button"
        className="quartz-account-trigger"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <div className="quartz-sidebar-avatar" aria-hidden="true">
          {accountInitial(session)}
        </div>
        <div className="quartz-account-label">
          <strong>{activeOrganization?.name ?? (session.user.displayName || session.user.email)}</strong>
          <span>{activeOrganization ? session.user.email : "Create or join organization"}</span>
        </div>
        <ChevronDown aria-hidden="true" size={16} strokeWidth={1.9} />
      </button>

      <QuartzOrganizationSettingsDialog
        open={settingsOpen}
        session={session}
        status={status}
        error={menuError}
        busy={busy}
        onOpenChange={setSettingsOpen}
        onCreateOrganization={onCreateOrganization}
        onSwitchOrganization={onSwitchOrganization}
        onInvite={onInvite}
        runAction={runAction}
      />
    </div>
  );
}

function QuartzConversationSidebar({
  activeWorkspace,
  activeThreadId,
  threads,
  search,
  collapsed,
  status,
  canUseChat,
  authSession,
  authLoading,
  authStatus,
  onSearchChange,
  onToggleCollapsed,
  onNewThread,
  onOpenLibraries,
  onSelectThread,
  onSignIn,
  onLogout,
  onCreateOrganization,
  onSwitchOrganization,
  onInvite,
}: {
  activeWorkspace: QuartzWorkspace;
  activeThreadId: string;
  threads: QuartzConversationThread[];
  search: string;
  collapsed: boolean;
  status: string;
  canUseChat: boolean;
  authSession: QuartzAuthSession | null;
  authLoading: boolean;
  authStatus: string;
  onSearchChange: (value: string) => void;
  onToggleCollapsed: () => void;
  onNewThread: () => void;
  onOpenLibraries: () => void;
  onSelectThread: (threadId: string) => void;
  onSignIn: () => void;
  onLogout: () => Promise<void>;
  onCreateOrganization: (name: string) => Promise<void>;
  onSwitchOrganization: (organizationId: string) => Promise<void>;
  onInvite: (organizationId: string, email: string) => Promise<void>;
}) {
  const normalizedSearch = search.trim().toLowerCase();
  const visibleThreads = threads
    .filter((thread) =>
      normalizedSearch
        ? thread.title.toLowerCase().includes(normalizedSearch)
        : true,
    )
    .sort(compareThreadsByRecency);

  return (
    <aside
      className={collapsed ? "quartz-history-sidebar is-collapsed" : "quartz-history-sidebar"}
      aria-label="Quartz navigation"
    >
      <div className="quartz-sidebar-header">
        <div className="quartz-sidebar-brand" aria-label="Quartz">
          <span>Quartz</span>
        </div>
        <div className="quartz-sidebar-header-actions">
          <button
            type="button"
            className="quartz-sidebar-icon-button quartz-sidebar-new-chat"
            aria-label="New chat"
            title="New chat"
            onClick={onNewThread}
            disabled={!canUseChat}
          >
            <PenLine aria-hidden="true" size={18} strokeWidth={1.9} />
          </button>
          <button
            type="button"
            className="quartz-sidebar-icon-button"
            aria-label={collapsed ? "Open sidebar" : "Close sidebar"}
            title={collapsed ? "Open sidebar" : "Close sidebar"}
            onClick={onToggleCollapsed}
          >
            {collapsed ? (
              <PanelLeftOpen aria-hidden="true" size={18} strokeWidth={1.9} />
            ) : (
              <PanelLeftClose aria-hidden="true" size={18} strokeWidth={1.9} />
            )}
          </button>
        </div>
      </div>

      {collapsed ? (
        <div className="quartz-sidebar-collapsed-actions">
          <button
            type="button"
            className="quartz-sidebar-icon-button"
            aria-label="New chat"
            title="New chat"
            onClick={onNewThread}
            disabled={!canUseChat}
          >
            <PenLine aria-hidden="true" size={18} strokeWidth={1.9} />
          </button>
          <button
            type="button"
            className="quartz-sidebar-icon-button"
            aria-label="Libraries"
            title="Libraries"
            onClick={onOpenLibraries}
          >
            <BookOpen aria-hidden="true" size={18} strokeWidth={1.9} />
          </button>
        </div>
      ) : null}

      <nav className="quartz-sidebar-scroll" aria-label="Quartz navigation">
        <div className="quartz-sidebar-actions">
          <button
            type="button"
            className="quartz-sidebar-row"
            onClick={onNewThread}
            disabled={!canUseChat}
          >
            <PenLine aria-hidden="true" size={17} strokeWidth={1.9} />
            <span>New chat</span>
          </button>
          <button
            type="button"
            className={
              activeWorkspace === "libraries"
                ? "quartz-sidebar-row is-active"
                : "quartz-sidebar-row"
            }
            aria-current={activeWorkspace === "libraries" ? "page" : undefined}
            onClick={onOpenLibraries}
          >
            <BookOpen aria-hidden="true" size={17} strokeWidth={1.9} />
            <span>Libraries</span>
          </button>
          <label className="quartz-sidebar-row quartz-sidebar-search">
            <Search aria-hidden="true" size={17} strokeWidth={1.9} />
            <input
              aria-label="Search chats"
              placeholder="Search chats"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </label>
        </div>

        <div className="quartz-sidebar-section">
          <div className="quartz-sidebar-heading">Chats</div>
          <div className="quartz-thread-list">
            {visibleThreads.map((thread) => {
              const active = thread.id === activeThreadId;
              return (
                <button
                  key={thread.id}
                  type="button"
                  className={
                    active && activeWorkspace === "chat"
                      ? "quartz-sidebar-row quartz-thread-row is-active"
                      : "quartz-sidebar-row quartz-thread-row"
                  }
                  data-thread-id={thread.id}
                  data-updated-at={thread.updatedAt}
                  aria-current={active && activeWorkspace === "chat" ? "page" : undefined}
                  onClick={() => onSelectThread(thread.id)}
                >
                  <MessageSquare
                    aria-hidden="true"
                    size={16}
                    strokeWidth={1.85}
                  />
                  <span>{thread.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {status ? (
          <div className="quartz-sidebar-status" role="status">
            {status}
          </div>
        ) : null}
      </nav>

      <QuartzAccountMenu
        session={authSession}
        loading={authLoading}
        status={authStatus}
        onSignIn={onSignIn}
        onLogout={onLogout}
        onCreateOrganization={onCreateOrganization}
        onSwitchOrganization={onSwitchOrganization}
        onInvite={onInvite}
      />
    </aside>
  );
}

// Harness-Requirement: proj-quartz.knowledge-agent-chat-service
// Harness-Requirement: proj-quartz.reasoning-effort-selector
// Harness-Requirement: proj-quartz.chatgpt-style-reasoning-control
// Harness-Requirement: proj-quartz.model-selector
// Harness-Requirement: proj-quartz.vendored-chat-surface
// Harness-Requirement: proj-quartz.quartz-agent-actor
// Harness-Requirement: proj-quartz.memory-curator-actor
// Harness-Requirement: proj-quartz.chatgpt-style-conversation-sidebar
// Harness-Requirement: proj-quartz.library-editor-sidebar
// Harness-Requirement: proj-quartz.library-editor-browse-readable
// Harness-Requirement: proj-quartz.library-editor-writable-editing
// Harness-Requirement: proj-quartz.library-editor-change-set-rendering
// Harness-Requirement: proj-quartz.library-editor-routing
export default function Page() {
  const { agent: pageAgent } = useAgent({
    agentId: "knowledge-agent",
    updates: [],
  });
  const [threadStoreReady, setThreadStoreReady] = useState(false);
  const [threads, setThreads] = useState<QuartzConversationThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState("");
  const [activeThreadIsHomeDraft, setActiveThreadIsHomeDraft] = useState(true);
  const [threadSearch, setThreadSearch] = useState("");
  const [activeWorkspace, setActiveWorkspace] = useState<QuartzWorkspace>("chat");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [hydratedThreadId, setHydratedThreadId] = useState("");
  const [authSession, setAuthSession] = useState<QuartzAuthSession | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authStatus, setAuthStatus] = useState("");
  const threadsRef = useRef<QuartzConversationThread[]>([]);
  const conversationRefreshRequestRef = useRef("");

  useEffect(() => {
    threadsRef.current = threads;
  }, [threads]);

  useLayoutEffect(() => {
    setActiveWorkspace(currentUrlWorkspace());
  }, []);

  const resetConversationState = useCallback((options?: { preserveWorkspaceRoute?: boolean }) => {
    setActiveWorkspace(options?.preserveWorkspaceRoute ? currentUrlWorkspace() : "chat");
    pageAgent.setMessages([]);
    setThreads([]);
    setActiveThreadId("");
    setActiveThreadIsHomeDraft(true);
    setHydratedThreadId("");
    setHistoryError("");
    setThreadStoreReady(false);
    if (!options?.preserveWorkspaceRoute) {
      updateChatUrl(null, "replace");
    }
  }, [pageAgent]);

  const refreshAuthSession = useCallback(async () => {
    setAuthLoading(true);
    try {
      const nextSession = await fetchAuthSession();
      setAuthSession(nextSession);
      return nextSession;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      setAuthLoading(true);
      try {
        const nextSession = await fetchAuthSession();
        if (!cancelled) {
          setAuthSession(nextSession);
        }
      } catch (error) {
        if (!cancelled) {
          setAuthStatus(error instanceof Error ? error.message : "Sign-in check failed.");
          setAuthSession(null);
        }
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
        }
      }
    }

    void loadSession();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadThreads() {
      if (authLoading) {
        return;
      }
      if (!authSession?.activeOrganization) {
        resetConversationState({ preserveWorkspaceRoute: true });
        setThreadStoreReady(true);
        return;
      }
      setThreadStoreReady(false);
      try {
        const loadedThreads = await fetchConversationList();
        if (cancelled) {
          return;
        }
        const routeThreadId = currentUrlThreadId();
        const routeWorkspace = currentUrlWorkspace();
        setThreads(loadedThreads);
        setActiveThreadId(routeThreadId ?? createThreadId());
        setActiveThreadIsHomeDraft(!routeThreadId);
        setActiveWorkspace(routeWorkspace);
        setHistoryError("");
      } catch (error) {
        if (!cancelled) {
          setHistoryError(
            error instanceof Error
              ? error.message
              : "Conversation history failed to load.",
          );
        }
      } finally {
        if (!cancelled) {
          setThreadStoreReady(true);
        }
      }
    }

    void loadThreads();
    return () => {
      cancelled = true;
    };
  }, [authLoading, authSession?.activeOrganization?.id, resetConversationState]);

  useEffect(() => {
    function handlePopState() {
      const routeWorkspace = currentUrlWorkspace();
      setActiveWorkspace(routeWorkspace);
      if (routeWorkspace === "libraries") {
        return;
      }
      const routeThreadId = currentUrlThreadId();
      setHydratedThreadId("");
      setHistoryError("");

      if (!routeThreadId) {
        pageAgent.setMessages([]);
        setActiveThreadId(createThreadId());
        setActiveThreadIsHomeDraft(true);
        return;
      }

      const selectedThread = threadsRef.current.find((thread) => thread.id === routeThreadId);
      pageAgent.setMessages(cloneMessages(selectedThread?.messages ?? []));
      setActiveThreadId(routeThreadId);
      setActiveThreadIsHomeDraft(false);
    }

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [pageAgent]);

  useEffect(() => {
    if (!threadStoreReady || !activeThreadId || activeThreadIsHomeDraft) {
      return;
    }

    const activeThread = threads.find((thread) => thread.id === activeThreadId);
    if (activeThread?.messagesLoaded) {
      return;
    }

    let cancelled = false;
    async function loadThread() {
      try {
        const loadedThread = await fetchConversation(activeThreadId);
        if (cancelled) {
          return;
        }
        setThreads((current) =>
          current.some((thread) => thread.id === loadedThread.id)
            ? current.map((thread) => {
                if (thread.id !== loadedThread.id) {
                  return thread;
                }
                const messages = mergeThreadMessages(
                  thread.messages,
                  loadedThread.messages,
                );
                return {
                  ...loadedThread,
                  title: threadTitleFromMessages(messages),
                  messages,
                  messagesLoaded: true,
                };
              })
            : [
                {
                  ...loadedThread,
                  title: threadTitleFromMessages(loadedThread.messages),
                  messagesLoaded: true,
                },
                ...current,
              ],
        );
        setHistoryError("");
      } catch (error) {
        if (!cancelled) {
          setHistoryError(
            error instanceof Error
              ? error.message
              : "Conversation failed to load.",
          );
        }
      }
    }

    void loadThread();
    return () => {
      cancelled = true;
    };
  }, [activeThreadId, activeThreadIsHomeDraft, threadStoreReady, threads]);

  const activeThread = threads.find((thread) => thread.id === activeThreadId);
  const activeThreadIsDraft = activeThreadIsHomeDraft && !activeThread;
  const activeThreadReady = Boolean(
    threadStoreReady &&
      activeThreadId &&
      (activeThreadIsDraft || activeThread?.messagesLoaded),
  );
  const activeMessages = activeThreadIsDraft ? [] : activeThread?.messages ?? [];
  const chatBodyClassName = activeThreadIsDraft
    ? "quartz-chat-body is-home"
    : "quartz-chat-body";
  const activeThreadHydrated = Boolean(
    activeThreadId && hydratedThreadId === activeThreadId,
  );

  useEffect(() => {
    setHydratedThreadId((current) =>
      current === activeThreadId ? current : "",
    );
  }, [activeThreadId]);

  const handleNewThread = useCallback(() => {
    setActiveWorkspace("chat");
    setHydratedThreadId("");
    pageAgent.setMessages([]);
    setActiveThreadId(createThreadId());
    setActiveThreadIsHomeDraft(true);
    updateChatUrl(null);
    setHistoryError("");
  }, [pageAgent]);

  const handleSelectThread = useCallback((threadId: string) => {
    setActiveWorkspace("chat");
    const selectedThread = threads.find((thread) => thread.id === threadId);
    setHydratedThreadId("");
    pageAgent.setMessages(cloneMessages(selectedThread?.messages ?? []));
    setActiveThreadId(threadId);
    setActiveThreadIsHomeDraft(false);
    updateChatUrl(threadId);
    setHistoryError("");
    setThreads((current) =>
      current.map((thread) =>
        thread.id === threadId
          ? { ...thread, messagesLoaded: false }
          : thread,
      ),
    );
  }, [pageAgent, threads]);

  const handleOpenLibraries = useCallback(() => {
    setActiveWorkspace("libraries");
    updateLibrariesUrl();
  }, []);

  const refreshThreadFromLibrary = useCallback(
    async (threadId: string, visibleMessages: Message[]) => {
      let lastError = "";

      for (let attempt = 0; attempt < maxConversationRefreshAttempts; attempt += 1) {
        if (attempt > 0) {
          await delay(conversationRefreshDelayMs(attempt));
        }

        try {
          const loadedThread = await fetchConversation(threadId);
          let refreshedMessages = mergeThreadMessages(
            visibleMessages,
            loadedThread.messages,
          );
          setThreads((current) => {
            let matchedThread = false;
            const nextThreads = current.map((thread) => {
              if (thread.id !== threadId) {
                return thread;
              }
              matchedThread = true;

              refreshedMessages = mergeMessageSnapshots(
                visibleMessages,
                thread.messages,
                loadedThread.messages,
              );

              return {
                ...loadedThread,
                title: threadTitleFromMessages(refreshedMessages),
                messages: refreshedMessages,
                messagesLoaded: true,
              };
            });

            if (matchedThread) {
              return nextThreads;
            }

            return [
              {
                ...loadedThread,
                title: threadTitleFromMessages(refreshedMessages),
                messages: refreshedMessages,
                messagesLoaded: true,
              },
              ...current,
            ];
          });
          setHistoryError("");

          if (hasAssistantAfterLatestUser(refreshedMessages)) {
            if (threadId === activeThreadId) {
              const livePageMessages = Array.isArray(pageAgent.messages)
                ? (pageAgent.messages as Message[])
                : [];
              pageAgent.setMessages(
                mergeMessageSnapshots(
                  livePageMessages,
                  visibleMessages,
                  refreshedMessages,
                ),
              );
            }
            return;
          }
        } catch (error) {
          lastError = error instanceof Error
            ? error.message
            : "Conversation refresh failed.";
        }
      }

      if (lastError) {
        setHistoryError(lastError);
      }
    },
    [activeThreadId, pageAgent],
  );

  const handleThreadMessagesChange = useCallback(
    (threadId: string, messages: Message[]) => {
      if (messages.length === 0) {
        return;
      }
      const latestUserKey = latestUserMessageKey(messages);
      if (latestUserKey && !hasAssistantAfterLatestUser(messages)) {
        const refreshKey = `${threadId}:${latestUserKey}`;
        if (conversationRefreshRequestRef.current !== refreshKey) {
          conversationRefreshRequestRef.current = refreshKey;
          void refreshThreadFromLibrary(threadId, cloneMessages(messages));
        }
      }
      if (threadId === activeThreadId && activeThreadIsHomeDraft) {
        updateChatUrl(threadId);
        setActiveThreadIsHomeDraft(false);
      }
      setThreads((current) => {
        const now = nowIso();
        let matchedThread = false;
        const nextThreads = current.map((thread) => {
          if (thread.id !== threadId) {
            return thread;
          }
          matchedThread = true;
          const mergedMessages = mergeThreadMessages(thread.messages, messages);
          if (messageFingerprint(thread.messages) === messageFingerprint(mergedMessages)) {
            return thread;
          }

          return {
            ...thread,
            title: threadTitleFromMessages(mergedMessages),
            updatedAt: now,
            messages: cloneMessages(mergedMessages),
            messagesLoaded: true,
          };
        });

        if (matchedThread) {
          return nextThreads;
        }

        return [
          {
            id: threadId,
            conversationId: conversationIdFromThreadId(threadId),
            title: threadTitleFromMessages(messages),
            createdAt: now,
            updatedAt: now,
            messages: cloneMessages(messages),
            messagesLoaded: true,
          },
          ...current,
        ];
      });
    },
    [
      activeThreadId,
      activeThreadIsHomeDraft,
      refreshThreadFromLibrary,
    ],
  );
  const handleThreadHydrated = useCallback((threadId: string) => {
    setHydratedThreadId((current) =>
      current === threadId ? current : threadId,
    );
  }, []);

  const handleMissingAssistant = useCallback(
    (threadId: string, visibleMessages: Message[]) => {
      void refreshThreadFromLibrary(threadId, visibleMessages);
    },
    [refreshThreadFromLibrary],
  );

  const chatContextValue = useMemo<QuartzThreadChatContextValue>(() => ({
    activeThreadId,
    storedMessages: activeMessages,
    onMessagesChange: handleThreadMessagesChange,
    onMissingAssistant: handleMissingAssistant,
    onHydratedThread: handleThreadHydrated,
  }), [
    activeMessages,
    activeThreadId,
    handleThreadHydrated,
    handleThreadMessagesChange,
    handleMissingAssistant,
  ]);
  const canUseChat = Boolean(authSession?.activeOrganization);

  const handleSignIn = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    const nextPath = `${window.location.pathname}${window.location.search}`;
    window.location.href = `/api/auth/google/start?next=${encodeURIComponent(nextPath)}`;
  }, []);

  const handleLogout = useCallback(async () => {
    await parseJsonResponse(await fetch("/api/auth/logout", { method: "POST" }));
    setAuthSession(null);
    setAuthStatus("");
    resetConversationState();
  }, [resetConversationState]);

  const handleCreateOrganization = useCallback(async (name: string) => {
    await parseJsonResponse(
      await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    );
    setAuthStatus("Organization created.");
    await refreshAuthSession();
  }, [refreshAuthSession]);

  const handleSwitchOrganization = useCallback(async (organizationId: string) => {
    await parseJsonResponse(
      await fetch(`/api/organizations/${encodeURIComponent(organizationId)}/switch`, {
        method: "POST",
      }),
    );
    resetConversationState();
    setAuthStatus("Organization switched.");
    await refreshAuthSession();
  }, [refreshAuthSession, resetConversationState]);

  const handleInvite = useCallback(async (organizationId: string, email: string) => {
    const json = await parseJsonResponse(
      await fetch(`/api/organizations/${encodeURIComponent(organizationId)}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }),
    );
    const delivery = json &&
      typeof json === "object" &&
      "delivery" in json &&
      json.delivery &&
      typeof json.delivery === "object" &&
      !Array.isArray(json.delivery)
        ? json.delivery as Record<string, unknown>
        : {};
    const inviteUrl = typeof delivery.inviteUrl === "string" ? delivery.inviteUrl : "";
    const status = typeof delivery.status === "string" ? delivery.status : "";
    setAuthStatus(
      status === "sent"
        ? "Invite email sent."
        : inviteUrl
          ? `Invite link: ${inviteUrl}`
          : "Invite created.",
    );
  }, []);

  return (
    <main className="quartz-shell">
      <QuartzConversationSidebar
        activeWorkspace={activeWorkspace}
        activeThreadId={activeThreadId}
        threads={threads}
        search={threadSearch}
        collapsed={sidebarCollapsed}
        status={historyError}
        canUseChat={canUseChat}
        authSession={authSession}
        authLoading={authLoading}
        authStatus={authStatus}
        onSearchChange={setThreadSearch}
        onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
        onNewThread={handleNewThread}
        onOpenLibraries={handleOpenLibraries}
        onSelectThread={handleSelectThread}
        onSignIn={handleSignIn}
        onLogout={handleLogout}
        onCreateOrganization={handleCreateOrganization}
        onSwitchOrganization={handleSwitchOrganization}
        onInvite={handleInvite}
      />

      <div className={activeWorkspace === "libraries" ? "quartz-main is-libraries" : "quartz-main"}>
        <header className="quartz-topbar">
          <div>
            <h1>Quartz</h1>
          </div>
        </header>
        {activeWorkspace === "libraries" ? (
          <section className="quartz-chat-panel quartz-libraries-panel" aria-label="Libraries">
            <div className="quartz-chat-frame quartz-libraries-frame">
              {!authLoading && !authSession ? (
                <div className="quartz-access-state">
                  <UserRound aria-hidden="true" size={22} strokeWidth={1.9} />
                  <h2>Sign in to Quartz</h2>
                  <p>Use your Google account to open your organizations and libraries.</p>
                  <button type="button" onClick={handleSignIn}>
                    Continue with Google
                  </button>
                </div>
              ) : !authLoading && authSession && !authSession.activeOrganization ? (
                <div className="quartz-access-state">
                  <Building2 aria-hidden="true" size={22} strokeWidth={1.9} />
                  <h2>Create or join an organization</h2>
                  <p>Open Settings from the sidebar account menu to create an organization, or accept an invite link.</p>
                </div>
              ) : authSession?.activeOrganization ? (
                <LibrariesWorkspace key={authSession.activeOrganization.id} />
              ) : null}
            </div>
          </section>
        ) : (
          <section className="quartz-chat-panel" aria-label="Knowledge Agent chat">
          <div className="quartz-chat-frame">
            <div className={chatBodyClassName}>
              {!authLoading && !authSession ? (
                <div className="quartz-access-state">
                  <UserRound aria-hidden="true" size={22} strokeWidth={1.9} />
                  <h2>Sign in to Quartz</h2>
                  <p>Use your Google account to open your organizations and libraries.</p>
                  <button type="button" onClick={handleSignIn}>
                    Continue with Google
                  </button>
                </div>
              ) : !authLoading && authSession && !authSession.activeOrganization ? (
                <div className="quartz-access-state">
                  <Building2 aria-hidden="true" size={22} strokeWidth={1.9} />
                  <h2>Create or join an organization</h2>
                  <p>Open Settings from the sidebar account menu to create an organization, or accept an invite link.</p>
                </div>
              ) : activeThreadReady && canUseChat ? (
                <QuartzThreadChatContext.Provider value={chatContextValue}>
                  <QuartzComposerDisabledContext.Provider value={!activeThreadHydrated}>
                    <CopilotChat
                      key={activeThreadId}
                      agentId="knowledge-agent"
                      threadId={activeThreadId}
                      chatView={QuartzThreadChatView}
                      input={{ children: QuartzChatInput }}
                      messageView={{
                        reasoningMessage: { children: QuartzReasoningMessage },
                      }}
                      labels={{
                        modalHeaderTitle: "Quartz Knowledge Agent",
                        welcomeMessageText: "Start with a question.",
                      }}
                    />
                  </QuartzComposerDisabledContext.Provider>
                </QuartzThreadChatContext.Provider>
              ) : null}
            </div>
          </div>
          </section>
        )}
      </div>
    </main>
  );
}
