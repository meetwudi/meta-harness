// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.routine-handoffs: discovers repository Routines that can be exposed as handoff agents.

import { parseToml } from "../../../librarian/impl/dist/index.js";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { RoutineDefinition } from "./routine-definition.js";

/**
 * Discovers checked-in Meta Harness Routine definitions from the repository harness.
 */
export function discoverRepositoryRoutines(repoRoot: string): RoutineDefinition[] {
  const routinesRoot = join(repoRoot, "harness", "routines");
  if (!existsSync(routinesRoot)) {
    return [];
  }
  return readdirSync(routinesRoot)
    .map((entry) => join(routinesRoot, entry))
    .filter((entryPath) => statSync(entryPath).isDirectory())
    .flatMap((routineRoot) => loadRoutineDefinition(routineRoot));
}

function loadRoutineDefinition(routineRoot: string): RoutineDefinition[] {
  const routineTomlPath = join(routineRoot, "ROUTINE.toml");
  if (!existsSync(routineTomlPath)) {
    return [];
  }
  const data = parseToml(readFileSync(routineTomlPath, "utf8"));
  const name = stringField(data, "name");
  const sourceLibrary = stringField(data, "source_library");
  const purpose = stringField(data, "purpose");
  if (!name || !sourceLibrary || !purpose) {
    return [];
  }
  const sourceLibraryName = sourceLibraryNameFromUri(sourceLibrary);
  if (!sourceLibraryName) {
    return [];
  }
  return [{
    name,
    sourceLibrary,
    sourceLibraryName,
    purpose,
    actorUri: `actor://routine/${sourceLibraryName}/routines/${name}`,
  }];
}

function stringField(data: Record<string, unknown>, field: string): string {
  const value = data[field];
  return typeof value === "string" ? value.trim() : "";
}

function sourceLibraryNameFromUri(sourceLibrary: string): string {
  if (!sourceLibrary.startsWith("library://")) {
    return "";
  }
  const libraryName = sourceLibrary.slice("library://".length);
  if (!libraryName || libraryName.includes("/")) {
    return "";
  }
  return libraryName;
}
