// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.library-scoped-sandbox-staging: stages Libraries by parsing Library indexes.
// Supports knowledge-agent.storage-agnostic-runtime: materializes local filesystem Libraries behind storage staging.

import { access, mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";
import { copyLibraryToSandbox } from "./copy-library-to-sandbox.js";
import { libraryIndexPaths } from "./library-index-paths.js";
import { loadLibraryIndexEntries } from "./load-library-index-entries.js";
import { renderLibraryIndex } from "./render-library-index.js";
import { resolveLibrarySource } from "./resolve-library-source.js";
import { resolveUnderRepo } from "./resolve-under-repo.js";
import { sandboxLibraryRelativeLocation } from "./sandbox-library-relative-location.js";
import type { LibraryIndexEntry, ProviderRunOptions } from "./types.js";

/**
 * Stages filesystem Libraries named by the requested Library index into the sandbox repo.
 */
export async function stageLibraryIndexes(options: ProviderRunOptions): Promise<void> {
  const requestedIndex = resolveUnderRepo(options.repoRoot, options.libraryIndex);
  const indexPaths = await libraryIndexPaths(requestedIndex);
  const checkedEntries: LibraryIndexEntry[] = [];
  const localEntries: LibraryIndexEntry[] = [];

  for (const indexPath of indexPaths) {
    const fromLocalIndex = basename(indexPath) === "LIBRARIES.local.toml";
    const loaded = await loadLibraryIndexEntries(indexPath);
    const renderedEntries = fromLocalIndex ? localEntries : checkedEntries;
    for (const entry of loaded.entries) {
      if (!entry.name) {
        continue;
      }
      const sourcePath = resolveLibrarySource(options.repoRoot, entry);
      if (!sourcePath) {
        renderedEntries.push(entry);
        continue;
      }
      try {
        await access(join(sourcePath, "LIBRARY.toml"));
      } catch {
        renderedEntries.push(entry);
        continue;
      }
      const sandboxRelativeLocation = sandboxLibraryRelativeLocation(
        options.repoRoot,
        sourcePath,
        entry.name,
      );
      await copyLibraryToSandbox(
        sourcePath,
        join(options.sandboxRepoRoot, sandboxRelativeLocation),
      );
      renderedEntries.push({
        name: entry.name,
        relative_location: sandboxRelativeLocation,
      });
    }
  }

  const checkedIndexTarget = join(
    options.sandboxRepoRoot,
    relative(options.repoRoot, requestedIndex),
  );
  await mkdir(dirname(checkedIndexTarget), { recursive: true });
  await writeFile(checkedIndexTarget, renderLibraryIndex(checkedEntries));
  if (localEntries.length > 0) {
    await writeFile(
      join(dirname(checkedIndexTarget), "LIBRARIES.local.toml"),
      renderLibraryIndex(localEntries),
    );
  }
}
