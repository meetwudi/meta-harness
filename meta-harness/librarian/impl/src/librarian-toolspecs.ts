// Generated file. Do not edit directly; update the ToolSpecs and Spec first.
// Supports librarian.toolspec-backed-agent-tools: loads Librarian tool definitions from ToolSpec primitives.
// Supports librarian.toolspec-actor-invocation: evaluates ToolSpec actor invocation governance.
// Supports knowledge-agent.library-toolspec-openai-tools: discovers ToolSpecs from readable Libraries.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadResolvedLibraries } from "./load-resolved-libraries.js";
import { matchesAnyPattern } from "./matches-any-pattern.js";
import { parseToml } from "./parse-toml.js";
import { stringArray } from "./string-array.js";
import type {
  LibrarianContext,
  ResolvedLibrary,
  TomlRecord,
  ToolSpecDefinition,
  ToolSpecSchema,
  ToolSpecTestCase,
} from "./types.js";

/**
 * Loads Librarian ToolSpec definitions from the repository ToolSpec folder.
 */
export function librarianToolSpecs(rootPath = defaultToolSpecsRoot()): ToolSpecDefinition[] {
  if (!existsSync(rootPath)) {
    throw new Error(`Librarian ToolSpec root does not exist: ${rootPath}`);
  }
  const toolSpecs = readdirSync(rootPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => resolve(rootPath, entry.name))
    .filter((toolRoot) => existsSync(resolve(toolRoot, "TOOLSPEC.toml")))
    .map(loadToolSpec)
    .sort((left, right) => left.order - right.order || left.name.localeCompare(right.name));
  if (toolSpecs.length === 0) {
    throw new Error(`Librarian ToolSpec root contains no ToolSpecs: ${rootPath}`);
  }
  return toolSpecs;
}

/**
 * Returns one Librarian ToolSpec by agent-facing tool name.
 */
export function librarianToolSpecByName(
  name: string,
): ToolSpecDefinition | undefined {
  return librarianToolSpecs().find((toolSpec) => toolSpec.name === name);
}

/**
 * Discovers ToolSpec definitions from readable Libraries in the current context.
 */
export async function discoverLibraryToolSpecs(
  context: LibrarianContext,
): Promise<ToolSpecDefinition[]> {
  const builtInNames = new Set(librarianToolSpecs().map((toolSpec) => toolSpec.name));
  const libraries = await loadResolvedLibraries(context);
  const discovered: ToolSpecDefinition[] = [];
  for (const library of libraries) {
    if (!library.readable) {
      continue;
    }
    await discoverLibraryToolSpecsUnder(library, discovered);
  }
  return discovered
    .filter((toolSpec) => !builtInNames.has(toolSpec.name))
    .sort((left, right) => left.order - right.order || left.name.localeCompare(right.name));
}

/**
 * Returns whether any active actor identity may invoke the ToolSpec.
 */
export function toolSpecAllowsActor(
  toolSpec: Pick<ToolSpecDefinition, "allowedActors">,
  actorUris: string[],
): boolean {
  return actorUris.some((actorUri) => matchesAnyPattern(toolSpec.allowedActors, actorUri));
}

function defaultToolSpecsRoot(): string {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  return resolve(currentDir, "../../toolspecs");
}

function loadToolSpec(rootPath: string): ToolSpecDefinition {
  const toolSpecPath = resolve(rootPath, "TOOLSPEC.toml");
  const data = parseToml(readFileSync(toolSpecPath, "utf8"));
  return toolSpecFromRecord(data, {
    rootPath,
    toolSpecPath,
    implementationBasePath: rootPath,
  });
}

async function discoverLibraryToolSpecsUnder(
  library: ResolvedLibrary,
  discovered: ToolSpecDefinition[],
): Promise<void> {
  await readToolSpecIfPresent(library, library.rootPath, discovered);
  const toolSpecsRoot = join(library.rootPath, "toolspecs");
  if (!(await library.storage.exists(toolSpecsRoot))) {
    return;
  }
  for (const entry of await library.storage.listDirectory(toolSpecsRoot)) {
    if (!entry.isDirectory || entry.name.startsWith(".")) {
      continue;
    }
    await readToolSpecIfPresent(library, join(toolSpecsRoot, entry.name), discovered);
  }
}

async function readToolSpecIfPresent(
  library: ResolvedLibrary,
  toolSpecRoot: string,
  discovered: ToolSpecDefinition[],
): Promise<void> {
  const toolSpecPath = join(toolSpecRoot, "TOOLSPEC.toml");
  if (!(await library.storage.exists(toolSpecPath))) {
    return;
  }
  const content = await library.storage.readText(toolSpecPath);
  discovered.push(toolSpecFromRecord(parseToml(content), {
    rootPath: dirname(toolSpecPath),
    toolSpecPath,
    implementationBasePath: dirname(toolSpecPath),
  }));
}

function toolSpecFromRecord(
  data: TomlRecord,
  input: {
    rootPath: string;
    toolSpecPath: string;
    implementationBasePath: string;
  },
): ToolSpecDefinition {
  const name = requiredString(data, "name", input.toolSpecPath);
  const description = requiredString(data, "description", input.toolSpecPath);
  const implementation = requiredString(data, "implementation", input.toolSpecPath);
  const allowedActors = requiredStringArray(data, "allowed_actors", input.toolSpecPath);
  return {
    name,
    description,
    implementation,
    implementationPath: implementation.startsWith("builtin/")
      ? implementation
      : resolve(input.implementationBasePath, implementation),
    allowedActors,
    order: numberField(data, "order", 0),
    inputSchema: parseSchema(data.input_schema, "input_schema", input.toolSpecPath),
    outputSchema: parseSchema(data.output_schema, "output_schema", input.toolSpecPath),
    testCases: parseTestCases(data.test_cases, input.toolSpecPath),
    rootPath: input.rootPath,
    toolSpecPath: input.toolSpecPath,
  };
}

function parseSchema(
  value: unknown,
  field: string,
  toolSpecPath: string,
): ToolSpecSchema {
  if (!isRecord(value)) {
    throw new Error(`${toolSpecPath}: ${field} must be a table`);
  }
  const type = requiredString(value, "type", `${toolSpecPath} ${field}`);
  const propertiesJson = stringField(value, "properties_json", "{}") ?? "{}";
  const schema: ToolSpecSchema = {
    type,
    properties: parseJsonObject(propertiesJson, `${toolSpecPath} ${field}.properties_json`),
    additionalProperties: booleanField(value, "additional_properties", true),
  };
  const required = stringArray(value.required);
  if (required.length > 0) {
    schema.required = required;
  }
  const description = stringField(value, "description", "") ?? "";
  if (description) {
    schema.description = description;
  }
  return schema;
}

function parseTestCases(
  value: unknown,
  toolSpecPath: string,
): ToolSpecTestCase[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new Error(`${toolSpecPath}: test_cases must be an array of tables`);
  }
  return value.map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`${toolSpecPath}: test_cases[${index}] must be a table`);
    }
    return {
      id: requiredString(item, "id", `${toolSpecPath} test_cases[${index}]`),
      inputJson: stringField(item, "input_json", undefined),
      expected: stringField(item, "expected", undefined),
      expectedOutputJson: stringField(item, "expected_output_json", undefined),
      expectedError: stringField(item, "expected_error", undefined),
    };
  });
}

function parseJsonObject(raw: string, label: string): Record<string, unknown> {
  const parsed = JSON.parse(raw) as unknown;
  if (!isRecord(parsed)) {
    throw new Error(`${label} must parse to a JSON object`);
  }
  return parsed;
}

function requiredString(
  data: TomlRecord,
  field: string,
  label: string,
): string {
  const value = data[field];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label}: ${field} must be a non-empty string`);
  }
  return value;
}

function requiredStringArray(
  data: TomlRecord,
  field: string,
  label: string,
): string[] {
  const values = stringArray(data[field]).filter((value) => value.trim());
  if (values.length === 0) {
    throw new Error(`${label}: ${field} must contain at least one string`);
  }
  return values;
}

function stringField(
  data: TomlRecord,
  field: string,
  fallback: string | undefined,
): string | undefined {
  const value = data[field];
  return typeof value === "string" ? value : fallback;
}

function numberField(
  data: TomlRecord,
  field: string,
  fallback: number,
): number {
  const value = data[field];
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value !== "string") {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function booleanField(
  data: TomlRecord,
  field: string,
  fallback: boolean,
): boolean {
  const value = data[field];
  return typeof value === "boolean" ? value : fallback;
}

function isRecord(value: unknown): value is TomlRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
