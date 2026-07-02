"use client";

// Harness-Requirement: proj-quartz.library-editor-browse-readable
// Harness-Requirement: proj-quartz.library-editor-writable-editing
// Harness-Requirement: proj-quartz.library-editor-change-set-rendering
// Harness-Requirement: proj-quartz.library-editor-shared-change-checks
// Harness-Requirement: proj-quartz.library-editor-sync-workflow
// Harness-Requirement: proj-quartz.library-editor-conflict-rebase
// Harness-Requirement: proj-quartz.library-editor-vendored-libraries
// Harness-Requirement: proj-quartz.library-editor-ui-labeling
// Harness-Requirement: proj-quartz.library-editor-public-proposed-changes
// Harness-Requirement: proj-quartz.library-editor-responsive-explorer
// Harness-Requirement: proj-quartz.library-editor-routing
// Harness-Requirement: proj-quartz.library-editor-persistent-proposed-changes
// Harness-Requirement: librarian.library-editor-librarian-boundary
// Harness-Requirement: librarian.tool-librarian-list-change-sets
// Harness-Requirement: change-sets.persistent-change-sets

import {
  ChevronDown,
  ChevronRight,
  FileText,
  GitPullRequestArrow,
  LockKeyhole,
  PanelRightClose,
  PanelRightOpen,
  RefreshCw,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

type QuartzLibrary = {
  name: string;
  uri: string;
  description: string;
  isSystemLibrary: boolean;
  readable: boolean;
  writable: boolean;
  deletable: boolean;
};

type QuartzLibraryFile = {
  uri: string;
};

type FileBaseline = {
  content: string;
};

type StagedChange = {
  uri: string;
  baselineContent?: string;
  content: string;
};

type ProducedChangeSet = Record<string, unknown>;

type ChangeSetCheck = {
  id: string;
  status: "pass" | "fail";
  message: string;
  uri?: string;
};

type ChangeSetValidation = {
  clean: boolean;
  checks: ChangeSetCheck[];
  conflicts: unknown[];
};

type ChangeSetStageResult = {
  changeSet: ProducedChangeSet;
  validation: ChangeSetValidation;
};

const fetchOptions: RequestInit = { cache: "no-store" };
const explorerWidthDefault = 260;
const explorerWidthMin = 220;
const explorerWidthMax = 420;

export function LibrariesWorkspace() {
  const [libraries, setLibraries] = useState<QuartzLibrary[]>([]);
  const [selectedLibraryUri, setSelectedLibraryUri] = useState("");
  const [files, setFiles] = useState<QuartzLibraryFile[]>([]);
  const [selectedFileUri, setSelectedFileUri] = useState("");
  const [fileBaselines, setFileBaselines] = useState<Record<string, FileBaseline>>({});
  const [draftEdits, setDraftEdits] = useState<Record<string, string>>({});
  const [stagedChanges, setStagedChanges] = useState<Record<string, StagedChange>>({});
  const [activeChangeSet, setActiveChangeSet] = useState<ProducedChangeSet | null>(null);
  const [activeChangeSetValidation, setActiveChangeSetValidation] =
    useState<ChangeSetValidation | null>(null);
  const [loadingLibraries, setLoadingLibraries] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);
  const [staging, setStaging] = useState(false);
  const [applying, setApplying] = useState(false);
  const [proposedChangesOpen, setProposedChangesOpen] = useState(false);
  const [explorerWidth, setExplorerWidth] = useState(explorerWidthDefault);
  const [resizingExplorer, setResizingExplorer] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const explorerRef = useRef<HTMLDivElement | null>(null);
  const explorerResizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const selectedLibrary = libraries.find((library) => library.uri === selectedLibraryUri);
  const selectedFile = files.find((file) => file.uri === selectedFileUri);
  const selectedBaseline = selectedFileUri ? fileBaselines[selectedFileUri] : undefined;
  const selectedStagedChange = selectedFileUri
    ? stagedChanges[selectedFileUri]
    : undefined;
  const editorContent = selectedFileUri
    ? draftEdits[selectedFileUri] ??
      selectedStagedChange?.content ??
      selectedBaseline?.content ??
      ""
    : "";
  const selectedFilePath = selectedFileUri
    ? selectedFileUri.replace(/^library:\/\/[^/]+\//, "")
    : "";
  const selectedCommittedContent = selectedStagedChange?.content ?? selectedBaseline?.content ?? "";
  const editorDirty = Boolean(
    selectedFileUri &&
    selectedBaseline &&
    editorContent !== selectedCommittedContent,
  );
  const canEditSelectedFile = Boolean(selectedLibrary?.writable && selectedFile);
  const stagedChangeList = useMemo<StagedChange[]>(
    () => (Object.values(stagedChanges) as StagedChange[])
      .sort((left, right) => left.uri.localeCompare(right.uri)),
    [stagedChanges],
  );
  const displayedChecks = useMemo(
    () => activeChangeSetValidation
      ? [...activeChangeSetValidation.checks].sort(compareChecksForDisplay)
      : [],
    [activeChangeSetValidation],
  );
  const workspaceClassName = [
    "quartz-libraries-workspace",
    proposedChangesOpen ? "has-proposed-changes" : "",
    resizingExplorer ? "is-resizing-explorer" : "",
  ].filter(Boolean).join(" ");
  const workspaceStyle = useMemo(
    () => ({
      "--quartz-library-explorer-width": `${explorerWidth}px`,
    }) as CSSProperties,
    [explorerWidth],
  );

  const loadLibraries = useCallback(async () => {
    setLoadingLibraries(true);
    setError("");
    try {
      const json = await parseJsonResponse(await fetch("/api/libraries", fetchOptions));
      const nextLibraries = parseLibraries(json);
      setLibraries(nextLibraries);
      setSelectedLibraryUri((current) =>
        current && nextLibraries.some((library) => library.uri === current)
          ? current
          : nextLibraries[0]?.uri ?? ""
      );
      setStatus(nextLibraries.length > 0 ? "" : "No readable libraries found.");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Libraries failed to load.");
    } finally {
      setLoadingLibraries(false);
    }
  }, []);

  useEffect(() => {
    void loadLibraries();
  }, [loadLibraries]);

  useEffect(() => {
    let cancelled = false;

    async function loadPersistedProposedChanges() {
      try {
        const persisted = parsePersistedChangeSets(
          await parseJsonResponse(await fetch("/api/libraries/change-set", fetchOptions)),
        );
        const latest = persisted[0];
        if (!latest) {
          return;
        }
        const changes = parseChangeSetChanges(latest.changeSet);
        if (changes.length === 0) {
          return;
        }
        const validation = await validateChangeSet(latest.changeSet);
        if (cancelled) {
          return;
        }
        setStagedChanges(indexStagedChanges(changes));
        setActiveChangeSet(latest.changeSet);
        setActiveChangeSetValidation(validation);
        setProposedChangesOpen(true);
        setStatus(validation.clean
          ? "Proposed changes restored."
          : "Restored proposed changes need attention.");
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error
            ? loadError.message
            : "Proposed changes failed to load.");
        }
      }
    }

    void loadPersistedProposedChanges();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadFiles() {
      if (!selectedLibraryUri) {
        setFiles([]);
        setSelectedFileUri("");
        return;
      }
      setLoadingFiles(true);
      setError("");
      try {
        const json = await parseJsonResponse(
          await fetch(
            `/api/libraries/files?libraryUri=${encodeURIComponent(selectedLibraryUri)}`,
            fetchOptions,
          ),
        );
        if (cancelled) {
          return;
        }
        const nextFiles = parseFiles(json);
        setFiles(nextFiles);
        setSelectedFileUri((current) =>
          current && nextFiles.some((file) => file.uri === current)
            ? current
            : nextFiles[0]?.uri ?? ""
        );
        setStatus(nextFiles.length > 0 ? "" : "This library has no visible files.");
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Library files failed to load.");
        }
      } finally {
        if (!cancelled) {
          setLoadingFiles(false);
        }
      }
    }

    void loadFiles();
    return () => {
      cancelled = true;
    };
  }, [selectedLibraryUri]);

  useEffect(() => {
    let cancelled = false;

    async function loadFile() {
      if (!selectedFileUri) {
        return;
      }
      if (fileBaselines[selectedFileUri]) {
        return;
      }
      setLoadingFile(true);
      setError("");
      try {
        const json = await parseJsonResponse(
          await fetch(
            `/api/libraries/file?uri=${encodeURIComponent(selectedFileUri)}`,
            fetchOptions,
          ),
        );
        if (cancelled) {
          return;
        }
        const content = parseFileContent(json);
        setFileBaselines((current) => ({
          ...current,
          [selectedFileUri]: { content },
        }));
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Library file failed to load.");
        }
      } finally {
        if (!cancelled) {
          setLoadingFile(false);
        }
      }
    }

    void loadFile();
    return () => {
      cancelled = true;
    };
  }, [fileBaselines, selectedFileUri]);

  const handleSelectLibrary = useCallback((uri: string) => {
    setSelectedLibraryUri(uri);
    setSelectedFileUri("");
    setFiles([]);
    setStatus("");
    setError("");
  }, []);

  const handleEditorChange = useCallback((content: string) => {
    if (!selectedFileUri || !canEditSelectedFile) {
      return;
    }
    setDraftEdits((current) => ({
      ...current,
      [selectedFileUri]: content,
    }));
  }, [canEditSelectedFile, selectedFileUri]);

  const handleStageChange = useCallback(async () => {
    if (!selectedFileUri || !selectedBaseline || !editorDirty || !canEditSelectedFile) {
      return;
    }
    const nextChanges = {
      ...stagedChanges,
      [selectedFileUri]: {
        uri: selectedFileUri,
        baselineContent: selectedBaseline.content,
        content: editorContent,
      },
    };
    setStaging(true);
    setError("");
    setStatus("");
    try {
      const staged = await stageChangeSet(Object.values(nextChanges));
      setActiveChangeSet(staged.changeSet);
      setActiveChangeSetValidation(staged.validation);
      setStagedChanges(nextChanges);
      setProposedChangesOpen(true);
      setDraftEdits((current) => {
        const next = { ...current };
        delete next[selectedFileUri];
        return next;
      });
      setStatus(staged.validation.clean ? "Proposed change checked." : "Proposed change checks need attention.");
    } catch (stageError) {
      setError(stageError instanceof Error ? stageError.message : "Proposed change check failed.");
    } finally {
      setStaging(false);
    }
  }, [
    editorContent,
    editorDirty,
    canEditSelectedFile,
    selectedBaseline,
    selectedFileUri,
    stagedChanges,
  ]);

  const handleRemoveStagedChange = useCallback(async (uri: string) => {
    const nextChanges = { ...stagedChanges };
    delete nextChanges[uri];
    setStaging(true);
    setError("");
    try {
      const remainingChanges: StagedChange[] = Object.values(nextChanges);
      const nextStaged = remainingChanges.length > 0
        ? await stageChangeSet(remainingChanges)
        : null;
      if (remainingChanges.length === 0 && activeChangeSet) {
        await abandonChangeSet(activeChangeSet);
      }
      setStagedChanges(nextChanges);
      setActiveChangeSet(nextStaged?.changeSet ?? null);
      setActiveChangeSetValidation(nextStaged?.validation ?? null);
      setStatus("Proposed change removed.");
    } catch (stageError) {
      setError(stageError instanceof Error ? stageError.message : "Proposed changes update failed.");
    } finally {
      setStaging(false);
    }
  }, [activeChangeSet, stagedChanges]);

  const handleApplyChangeSet = useCallback(async () => {
    if (stagedChangeList.length === 0 || !activeChangeSet || !activeChangeSetValidation?.clean) {
      return;
    }
    setApplying(true);
    setError("");
    setStatus("");
    try {
      parseApplyResult(await parseJsonResponse(
        await fetch("/api/libraries/change-set/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ changeSet: activeChangeSet }),
        }),
      ));
      setFileBaselines((current) => {
        const next = { ...current };
        for (const change of stagedChangeList) {
          next[change.uri] = { content: change.content };
        }
        return next;
      });
      setDraftEdits((current) => {
        const next = { ...current };
        for (const change of stagedChangeList) {
          delete next[change.uri];
        }
        return next;
      });
      setStagedChanges({});
      setActiveChangeSet(null);
      setActiveChangeSetValidation(null);
      setStatus("Proposed changes applied.");
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : "Proposed changes apply failed.");
    } finally {
      setApplying(false);
    }
  }, [activeChangeSet, activeChangeSetValidation, stagedChangeList]);

  const handleExplorerResizeStart = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    explorerResizeRef.current = {
      startX: event.clientX,
      startWidth: explorerRef.current?.getBoundingClientRect().width ?? explorerWidth,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setResizingExplorer(true);
  }, [explorerWidth]);

  const handleExplorerResizeMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const resize = explorerResizeRef.current;
    if (!resize) {
      return;
    }
    const nextWidth = resize.startWidth + event.clientX - resize.startX;
    setExplorerWidth(clampNumber(nextWidth, explorerWidthMin, explorerWidthMax));
  }, []);

  const handleExplorerResizeEnd = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    explorerResizeRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setResizingExplorer(false);
  }, []);

  const handleExplorerResizeKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const direction = event.key === "ArrowLeft" ? -1 : 1;
      const step = event.shiftKey ? 24 : 12;
      setExplorerWidth((current) =>
        clampNumber(current + direction * step, explorerWidthMin, explorerWidthMax)
      );
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setExplorerWidth(event.key === "Home" ? explorerWidthMin : explorerWidthMax);
    }
  }, []);

  return (
    <section
      className={workspaceClassName}
      aria-label="Library workspace"
      style={workspaceStyle}
    >
      <div ref={explorerRef} className="quartz-library-explorer" aria-label="Library explorer">
        <div className="quartz-libraries-section-header">
          <h2>Explorer</h2>
          <button
            type="button"
            className="quartz-libraries-icon-button"
            aria-label="Refresh libraries"
            title="Refresh libraries"
            onClick={() => void loadLibraries()}
            disabled={loadingLibraries}
          >
            <RefreshCw aria-hidden="true" size={15} strokeWidth={1.9} />
          </button>
        </div>
        <div className="quartz-library-tree">
          {libraries.map((library) => {
            const selected = library.uri === selectedLibraryUri;
            return (
              <div
                key={library.uri}
                className={selected ? "quartz-library-tree-item is-selected" : "quartz-library-tree-item"}
              >
                <button
                  type="button"
                  className={selected ? "quartz-library-row is-selected" : "quartz-library-row"}
                  aria-current={selected ? "page" : undefined}
                  onClick={() => handleSelectLibrary(library.uri)}
                >
                  {selected ? (
                    <ChevronDown aria-hidden="true" size={14} strokeWidth={1.8} />
                  ) : (
                    <ChevronRight aria-hidden="true" size={14} strokeWidth={1.8} />
                  )}
                  <span className="quartz-library-row-main">
                    <span>{library.name}</span>
                    <small>{library.description || library.uri}</small>
                  </span>
                  {library.writable ? null : (
                    <LockKeyhole
                      className="quartz-library-lock"
                      aria-label="Read only"
                      size={13}
                      strokeWidth={1.8}
                    />
                  )}
                </button>
                {selected ? (
                  <div className="quartz-library-file-branch" aria-label={`${library.name} files`}>
                    {files.map((file) => {
                      const fileSelected = file.uri === selectedFileUri;
                      const pathLabel = file.uri.replace(/^library:\/\/[^/]+\//, "");
                      return (
                        <button
                          key={file.uri}
                          type="button"
                          className={fileSelected ? "quartz-library-file-row is-selected" : "quartz-library-file-row"}
                          aria-current={fileSelected ? "page" : undefined}
                          onClick={() => setSelectedFileUri(file.uri)}
                        >
                          <FileText aria-hidden="true" size={14} strokeWidth={1.8} />
                          <span>{pathLabel}</span>
                        </button>
                      );
                    })}
                    {loadingFiles ? (
                      <div className="quartz-libraries-muted">Loading files...</div>
                    ) : null}
                    {!loadingFiles && files.length === 0 ? (
                      <div className="quartz-libraries-muted">No visible files.</div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
          {loadingLibraries ? (
            <div className="quartz-libraries-muted">Loading libraries...</div>
          ) : null}
        </div>
        <div
          className={resizingExplorer
            ? "quartz-library-resize-handle is-resizing"
            : "quartz-library-resize-handle"}
          role="separator"
          aria-label="Resize library explorer"
          aria-orientation="vertical"
          aria-valuemin={explorerWidthMin}
          aria-valuemax={explorerWidthMax}
          aria-valuenow={Math.round(explorerWidth)}
          tabIndex={0}
          title="Resize library explorer"
          onPointerDown={handleExplorerResizeStart}
          onPointerMove={handleExplorerResizeMove}
          onPointerUp={handleExplorerResizeEnd}
          onPointerCancel={handleExplorerResizeEnd}
          onKeyDown={handleExplorerResizeKeyDown}
        />
      </div>

      <div className="quartz-library-editor-pane">
        <div className="quartz-library-editor-header">
          <div>
            <p>
              {selectedLibrary?.name ?? "Select a library"}
              {selectedLibrary && !selectedLibrary.writable ? (
                <span className="quartz-library-readonly-pill">
                  <LockKeyhole aria-hidden="true" size={12} strokeWidth={1.8} />
                  Read only
                </span>
              ) : null}
            </p>
            <h2>{selectedFilePath || "Select a file"}</h2>
          </div>
          <div className="quartz-library-editor-actions">
            <button
              type="button"
              className="quartz-library-proposed-toggle"
              aria-pressed={proposedChangesOpen}
              onClick={() => setProposedChangesOpen((current) => !current)}
            >
              {proposedChangesOpen ? (
                <PanelRightClose aria-hidden="true" size={15} strokeWidth={1.9} />
              ) : (
                <PanelRightOpen aria-hidden="true" size={15} strokeWidth={1.9} />
              )}
              <span>Proposed changes</span>
              <strong>{stagedChangeList.length}</strong>
            </button>
            <button
              type="button"
              className="quartz-library-primary-action"
              onClick={() => void handleStageChange()}
              disabled={!canEditSelectedFile || !editorDirty || staging}
            >
              Add to proposed changes
            </button>
          </div>
        </div>
        {selectedFile ? (
          <textarea
            className="quartz-library-editor"
            aria-label="Library file content"
            value={loadingFile && !selectedBaseline ? "Loading file..." : editorContent}
            onChange={(event) => handleEditorChange(event.target.value)}
            readOnly={!canEditSelectedFile || loadingFile}
            spellCheck={false}
          />
        ) : (
          <div className="quartz-library-empty-state">
            Select a readable library file.
          </div>
        )}
      </div>

      {proposedChangesOpen ? (
        <aside className="quartz-proposed-changes-panel" aria-label="Proposed changes">
          <div className="quartz-libraries-section-header">
            <h2>Proposed changes</h2>
            <span>{stagedChangeList.length}</span>
          </div>
          <div className="quartz-proposed-changes-list">
            {stagedChangeList.map((change) => (
              <div key={change.uri} className="quartz-proposed-changes-row">
                <GitPullRequestArrow aria-hidden="true" size={14} strokeWidth={1.8} />
                <span>{change.uri.replace(/^library:\/\/[^/]+\//, "")}</span>
                <button
                  type="button"
                  onClick={() => void handleRemoveStagedChange(change.uri)}
                  disabled={staging || applying}
                >
                  Remove
                </button>
              </div>
            ))}
            {stagedChangeList.length === 0 ? (
              <div className="quartz-libraries-muted">
                Add edits before applying.
              </div>
            ) : null}
            {activeChangeSetValidation ? (
              <div className="quartz-proposed-changes-checks" aria-label="Proposed change checks">
                {displayedChecks.map((check, index) => (
                  <div
                    key={`${check.id}-${check.uri ?? "global"}-${index}`}
                    className={check.status === "pass" ? "is-pass" : "is-fail"}
                  >
                    <span>{check.status === "pass" ? "Passed" : "Failed"}</span>
                    <small>{publicCheckMessage(check)}</small>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="quartz-proposed-changes-apply"
            onClick={() => void handleApplyChangeSet()}
            disabled={
              stagedChangeList.length === 0 ||
              !activeChangeSet ||
              !activeChangeSetValidation?.clean ||
              applying ||
              staging
            }
          >
            Apply proposed changes
          </button>
          {status ? (
            <div className="quartz-libraries-status" role="status">{status}</div>
          ) : null}
          {error ? (
            <div className="quartz-libraries-error" role="alert">{publicErrorMessage(error)}</div>
          ) : null}
        </aside>
      ) : (
        <div className="quartz-libraries-floating-status" aria-live="polite">
          {status ? (
            <div className="quartz-libraries-status" role="status">{status}</div>
          ) : null}
          {error ? (
            <div className="quartz-libraries-error" role="alert">{publicErrorMessage(error)}</div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

async function stageChangeSet(changes: StagedChange[]): Promise<ChangeSetStageResult> {
  const produced = await produceChangeSet(changes);
  const validation = await validateChangeSet(produced.changeSet);
  const checks = mergeChecksForDisplay([...produced.checks, ...validation.checks]);
  return {
    changeSet: produced.changeSet,
    validation: {
      ...validation,
      clean: validation.clean && produced.checks.every((check) => check.status === "pass"),
      checks,
    },
  };
}

function mergeChecksForDisplay(checks: ChangeSetCheck[]): ChangeSetCheck[] {
  const merged = new Map<string, ChangeSetCheck>();
  for (const check of checks) {
    merged.set(
      [check.id, check.uri ?? "", check.status, check.message].join("::"),
      check,
    );
  }
  return [...merged.values()];
}

async function produceChangeSet(
  changes: StagedChange[],
): Promise<{ changeSet: ProducedChangeSet; checks: ChangeSetCheck[] }> {
  const output = await parseJsonResponse(
    await fetch("/api/libraries/change-set/produce", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ changes }),
    }),
  );
  return parseProducedChangeSet(output);
}

async function validateChangeSet(changeSet: ProducedChangeSet): Promise<ChangeSetValidation> {
  const output = await parseJsonResponse(
    await fetch("/api/libraries/change-set/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ changeSet }),
    }),
  );
  return parseChangeSetValidation(output);
}

async function abandonChangeSet(changeSet: ProducedChangeSet): Promise<void> {
  parseAbandonResult(await parseJsonResponse(
    await fetch("/api/libraries/change-set", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ changeSet }),
    }),
  ));
}

function parseProducedChangeSet(
  output: unknown,
): { changeSet: ProducedChangeSet; checks: ChangeSetCheck[] } {
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    throw new Error("Proposed changes response was malformed.");
  }
  const record = output as Record<string, unknown>;
  const changeSet = record.changeSet;
  if (!changeSet || typeof changeSet !== "object" || Array.isArray(changeSet)) {
    throw new Error("Proposed changes response was malformed.");
  }
  if (!Array.isArray(record.checks)) {
    throw new Error("Proposed changes response was malformed.");
  }
  return {
    changeSet: changeSet as ProducedChangeSet,
    checks: record.checks.map(parseChangeSetCheck),
  };
}

function parseChangeSetValidation(output: unknown): ChangeSetValidation {
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    throw new Error("Proposed changes validation response was malformed.");
  }
  const record = output as Record<string, unknown>;
  if (
    typeof record.clean !== "boolean" ||
    !Array.isArray(record.checks) ||
    !Array.isArray(record.conflicts)
  ) {
    throw new Error("Proposed changes validation response was malformed.");
  }
  return {
    clean: record.clean,
    checks: record.checks.map(parseChangeSetCheck),
    conflicts: record.conflicts,
  };
}

function parseApplyResult(output: unknown): void {
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    throw new Error("Proposed changes apply response was malformed.");
  }
  const record = output as Record<string, unknown>;
  if (
    record.applied !== true ||
    typeof record.changeSetId !== "string" ||
    !Array.isArray(record.checks) ||
    !Array.isArray(record.appliedChanges) ||
    !record.appliedChanges.every(isAppliedChange)
  ) {
    throw new Error("Proposed changes apply response was malformed.");
  }
}

function parseAbandonResult(output: unknown): void {
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    throw new Error("Proposed changes response was malformed.");
  }
  const record = output as Record<string, unknown>;
  if (record.abandoned !== true || typeof record.changeSetId !== "string") {
    throw new Error("Proposed changes response was malformed.");
  }
}

type PersistedChangeSetRecord = {
  status: "proposed" | "applied";
  updatedAt: string;
  changeSet: ProducedChangeSet;
};

function parsePersistedChangeSets(output: unknown): PersistedChangeSetRecord[] {
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    throw new Error("Proposed changes response was malformed.");
  }
  const changeSets = (output as Record<string, unknown>).changeSets;
  if (!Array.isArray(changeSets)) {
    throw new Error("Proposed changes response was malformed.");
  }
  return changeSets.map(parsePersistedChangeSetRecord);
}

function parsePersistedChangeSetRecord(item: unknown): PersistedChangeSetRecord {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new Error("Proposed changes response included a malformed record.");
  }
  const record = item as Record<string, unknown>;
  const changeSet = record.changeSet;
  if (
    (record.status !== "proposed" && record.status !== "applied") ||
    typeof record.updatedAt !== "string" ||
    !changeSet ||
    typeof changeSet !== "object" ||
    Array.isArray(changeSet)
  ) {
    throw new Error("Proposed changes response included a malformed record.");
  }
  return {
    status: record.status,
    updatedAt: record.updatedAt,
    changeSet: changeSet as ProducedChangeSet,
  };
}

function parseChangeSetChanges(changeSet: ProducedChangeSet): StagedChange[] {
  const changes = changeSet.changes;
  if (!Array.isArray(changes)) {
    throw new Error("Proposed changes response included malformed changes.");
  }
  return changes.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("Proposed changes response included a malformed change.");
    }
    const record = item as Record<string, unknown>;
    const proposed = record.proposed;
    if (
      typeof record.uri !== "string" ||
      !proposed ||
      typeof proposed !== "object" ||
      Array.isArray(proposed) ||
      typeof (proposed as Record<string, unknown>).content !== "string"
    ) {
      throw new Error("Proposed changes response included a malformed change.");
    }
    return {
      uri: record.uri,
      content: (proposed as Record<string, string>).content,
    };
  });
}

function indexStagedChanges(changes: StagedChange[]): Record<string, StagedChange> {
  const indexed: Record<string, StagedChange> = {};
  for (const change of changes) {
    indexed[change.uri] = change;
  }
  return indexed;
}

function isAppliedChange(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.uri === "string" &&
    typeof record.sha256 === "string" &&
    typeof record.bytesWritten === "number";
}

function parseChangeSetCheck(value: unknown): ChangeSetCheck {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Proposed changes check response was malformed.");
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== "string" ||
    (record.status !== "pass" && record.status !== "fail") ||
    typeof record.message !== "string" ||
    (record.uri !== undefined && typeof record.uri !== "string")
  ) {
    throw new Error("Proposed changes check response was malformed.");
  }
  return {
    id: record.id,
    status: record.status,
    message: record.message,
    uri: typeof record.uri === "string" ? record.uri : undefined,
  };
}

function publicCheckMessage(check: ChangeSetCheck): string {
  if (check.id === "librarian.change-set-shape") {
    return "Proposed changes are well formed.";
  }
  if (check.id === "librarian.change-set-id") {
    return check.status === "pass"
      ? "Proposed changes identity matches the edited files."
      : "Proposed changes identity needs to be refreshed.";
  }
  if (check.id === "change-sets.baseline-conflict-detection") {
    return "The file changed underneath this edit and needs reconciliation.";
  }
  if (check.id === "change-sets.git-diff-format") {
    return check.status === "pass"
      ? "Proposed changes match the current baseline."
      : "Proposed changes need to be refreshed from the current baseline.";
  }
  return check.message
    .replace(/\bChange set\b/g, "Proposed changes")
    .replace(/\bchange set\b/g, "proposed changes");
}

function compareChecksForDisplay(left: ChangeSetCheck, right: ChangeSetCheck): number {
  if (left.status !== right.status) {
    return left.status === "fail" ? -1 : 1;
  }
  return left.id.localeCompare(right.id);
}

function publicErrorMessage(message: string): string {
  return message
    .replace(/\bChange set\b/g, "Proposed changes")
    .replace(/\bchange set\b/g, "proposed changes");
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  let json: unknown = {};
  if (text.trim()) {
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      throw new Error(`Libraries response was malformed with status ${response.status}.`);
    }
  }
  if (!response.ok) {
    const message = json &&
      typeof json === "object" &&
      "error" in json &&
      typeof json.error === "string"
        ? json.error
        : `Libraries request failed with ${response.status}.`;
    throw new Error(message);
  }
  return json;
}

function parseLibraries(value: unknown): QuartzLibrary[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Libraries response was malformed.");
  }
  const libraries = (value as Record<string, unknown>).libraries;
  if (!Array.isArray(libraries)) {
    throw new Error("Libraries response was malformed.");
  }
  return libraries.map(parseLibraryRecord);
}

function parseFiles(value: unknown): QuartzLibraryFile[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Library files response was malformed.");
  }
  const files = (value as Record<string, unknown>).files;
  if (!Array.isArray(files)) {
    throw new Error("Library files response was malformed.");
  }
  return files.map(parseFileRecord);
}

function parseLibraryRecord(item: unknown): QuartzLibrary {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new Error("Libraries response included a malformed library.");
  }
  const record = item as Record<string, unknown>;
  if (
    typeof record.name !== "string" ||
    typeof record.uri !== "string" ||
    typeof record.description !== "string" ||
    typeof record.isSystemLibrary !== "boolean" ||
    typeof record.readable !== "boolean" ||
    typeof record.writable !== "boolean" ||
    typeof record.deletable !== "boolean"
  ) {
    throw new Error("Libraries response included a malformed library.");
  }
  return {
    name: record.name,
    uri: record.uri,
    description: record.description,
    isSystemLibrary: record.isSystemLibrary,
    readable: record.readable,
    writable: record.writable,
    deletable: record.deletable,
  };
}

function parseFileRecord(item: unknown): QuartzLibraryFile {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new Error("Library files response included a malformed file.");
  }
  const uri = (item as Record<string, unknown>).uri;
  if (typeof uri !== "string") {
    throw new Error("Library files response included a malformed file.");
  }
  return { uri };
}

function parseFileContent(value: unknown): string {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    typeof (value as Record<string, unknown>).content !== "string"
  ) {
    throw new Error("Library file response was malformed.");
  }
  return (value as Record<string, string>).content;
}
