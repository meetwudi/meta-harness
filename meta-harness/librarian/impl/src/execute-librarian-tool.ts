// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.shamanistic-library-tools: executes Librarian tools by name.
// Supports librarian.tool-call-observability: records every Librarian tool call.
// Supports librarian.tool-router: routes each agent-facing Librarian tool.
// Supports librarian.tool-librarian-add-tags: routes the add Tags tool.
// Supports librarian.tool-librarian-remove-tags: routes the remove Tags tool.
// Supports librarian.tool-librarian-query-by-tags: routes the query by Tags tool.

import { addTags } from "./add-tags.js";
import { createLibraryInStorageLocation } from "./create-library-in-storage-location.js";
import { introLibraries } from "./intro-libraries.js";
import { listLibraryFiles } from "./list-library-files.js";
import { listLibraries } from "./list-libraries.js";
import { queryByTags } from "./query-by-tags.js";
import { readLibraryFile } from "./read-library-file.js";
import { recordToolCall } from "./record-tool-call.js";
import { removeTags } from "./remove-tags.js";
import { searchLibraryFiles } from "./search-library-files.js";
import type { LibrarianContext } from "./types.js";
import { updateLibraryFile } from "./update-library-file.js";

/**
 * Executes one Librarian tool and records its input and redacted output.
 */
export async function executeLibrarianTool(
  context: LibrarianContext,
  toolName: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  let output: unknown;
  if (toolName === "librarian_intro") {
    output = await introLibraries(context);
  } else if (toolName === "librarian_list_libraries") {
    output = await listLibraries(context);
  } else if (toolName === "librarian_list_files") {
    output = await listLibraryFiles(context, {
      uri: String(input.uri),
      recursive: Boolean(input.recursive),
    });
  } else if (toolName === "librarian_read") {
    output = await readLibraryFile(context, {
      uri: String(input.uri),
    });
  } else if (toolName === "librarian_search") {
    output = await searchLibraryFiles(context, {
      libraryUriPatterns: Array.isArray(input.libraryUriPatterns)
        ? input.libraryUriPatterns.map(String)
        : [],
      query: String(input.query),
      limit: typeof input.limit === "number" ? input.limit : undefined,
    });
  } else if (toolName === "librarian_update") {
    output = await updateLibraryFile(context, {
      uri: String(input.uri),
      content: String(input.content),
    });
  } else if (toolName === "librarian_create_library") {
    output = await createLibraryInStorageLocation(context, {
      storageLocationName: typeof input.storageLocationName === "string" ? input.storageLocationName : "",
      name: typeof input.name === "string" ? input.name : "",
      description: typeof input.description === "string" ? input.description : undefined,
    });
  } else if (toolName === "librarian_add_tags") {
    output = await addTags(context, {
      scopeUri: String(input.scopeUri),
      tags: input.tags,
    });
  } else if (toolName === "librarian_remove_tags") {
    output = await removeTags(context, {
      scopeUri: String(input.scopeUri),
      tags: input.tags,
    });
  } else if (toolName === "librarian_query_by_tags") {
    output = await queryByTags(context, {
      libraryUris: Array.isArray(input.libraryUris)
        ? input.libraryUris.map(String)
        : undefined,
      libraryUriPatterns: Array.isArray(input.libraryUriPatterns)
        ? input.libraryUriPatterns.map(String)
        : undefined,
      tags: input.tags,
      match: input.match === "any" ? "any" : "all",
      limit: typeof input.limit === "number" ? input.limit : undefined,
    });
  } else {
    throw new Error(`Unknown Librarian tool: ${toolName}`);
  }
  recordToolCall(context, toolName, input, output);
  return output;
}
