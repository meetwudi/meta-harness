// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.library-list-fields: resolves Library index entries into listed Libraries.
// Supports librarian.readable-writable-computed: attaches computed access to each Library.

import { join } from "node:path";
import { computeLibraryAccess } from "./compute-library-access.js";
import { libraryUriFromName } from "./library-uri-from-name.js";
import { loadLibraryIndexEntries } from "./load-library-index-entries.js";
import { readTomlFile } from "./read-toml-file.js";
import { resolveLibraryRoot } from "./resolve-library-root.js";
import { stringArray } from "./string-array.js";
import type { LibrarianContext, ResolvedLibrary } from "./types.js";

/**
 * Resolves all Libraries available from the context Library indexes.
 */
export async function loadResolvedLibraries(
  context: LibrarianContext,
): Promise<ResolvedLibrary[]> {
  const libraries = new Map<string, ResolvedLibrary>();
  for (const indexPath of context.libraryIndexPaths) {
    const index = await loadLibraryIndexEntries(context.storage, indexPath);
    const basePath = context.libraryIndexBasePaths?.[indexPath] ?? index.basePath;
    for (const entry of index.entries) {
      const rootPath = resolveLibraryRoot(basePath, entry);
      const manifestPath = join(rootPath, "LIBRARY.toml");
      const manifest = await readTomlFile(context.storage, manifestPath);
      const access = computeLibraryAccess(manifest, context.actorUri);
      const name = typeof manifest.name === "string" ? manifest.name : entry.name;
      const uri = libraryUriFromName(entry.name);
      libraries.set(uri, {
        name,
        uri,
        description: typeof manifest.description === "string" ? manifest.description : "",
        readable: access.readable,
        writable: access.writable,
        rootPath,
        agentExcludes: stringArray(manifest.agent_excludes),
      });
    }
  }
  return [...libraries.values()];
}
