// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.tool-librarian-add-tags: reads and writes scoped TAGS.toml records.
// Supports librarian.tool-librarian-remove-tags: reads and writes scoped TAGS.toml records.
// Supports librarian.tool-librarian-query-by-tags: parses scoped TAGS.toml records.

import { dirname, posix } from "node:path";
import { parseToml } from "./parse-toml.js";
import { resolveLibraryFilePath } from "./resolve-library-file-path.js";
import { stringArray } from "./string-array.js";
import type { ResolvedLibrary } from "./types.js";

export type TagsRecord = {
  exists: boolean;
  tags: string[];
};

/**
 * Returns the Library-relative TAGS.toml path for a scoped knowledge URI path.
 */
export function tagsRecordPath(scopePath: string): string {
  return scopePath ? posix.join(scopePath, "TAGS.toml") : "TAGS.toml";
}

/**
 * Normalizes agent-provided tag values into unique non-empty strings.
 */
export function normalizeTagValues(value: unknown, label = "tags"): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array of strings`);
  }
  const tags: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") {
      throw new Error(`${label} must contain only strings`);
    }
    const tag = item.trim();
    if (!tag) {
      throw new Error(`${label} must contain non-empty strings`);
    }
    if (!tags.includes(tag)) {
      tags.push(tag);
    }
  }
  if (tags.length === 0) {
    throw new Error(`${label} must contain at least one tag`);
  }
  return tags;
}

/**
 * Reads a TAGS.toml record for a scoped knowledge URI path.
 */
export async function readTagsRecord(
  library: ResolvedLibrary,
  recordPath: string,
): Promise<TagsRecord> {
  const filePath = resolveLibraryFilePath(library.rootPath, recordPath);
  if (!(await library.storage.exists(filePath))) {
    return { exists: false, tags: [] };
  }
  const data = parseToml(await library.storage.readText(filePath));
  return { exists: true, tags: uniqueTags(stringArray(data.tags)) };
}

/**
 * Writes a TAGS.toml record for a scoped knowledge URI path.
 */
export async function writeTagsRecord(
  library: ResolvedLibrary,
  recordPath: string,
  tags: string[],
): Promise<void> {
  const filePath = resolveLibraryFilePath(library.rootPath, recordPath);
  await library.storage.makeDirectory(dirname(filePath));
  await library.storage.writeText(filePath, formatTagsToml(tags));
}

/**
 * Formats normalized tag values as a Harness TAGS.toml primitive record.
 */
export function formatTagsToml(tags: string[]): string {
  return [
    "# This is a Harness primitive.",
    "# See also: library://meta-harness",
    "",
    "tags = [",
    ...tags.map((tag) => `  ${JSON.stringify(tag)},`),
    "]",
    "",
  ].join("\n");
}

function uniqueTags(tags: string[]): string[] {
  const result: string[] = [];
  for (const tag of tags.map((item) => item.trim()).filter(Boolean)) {
    if (!result.includes(tag)) {
      result.push(tag);
    }
  }
  return result;
}
