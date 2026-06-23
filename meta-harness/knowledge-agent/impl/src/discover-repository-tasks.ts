// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.task-handoffs: discovers repository Tasks that can be exposed as handoff agents.

import { parseToml } from "../../../librarian/impl/dist/index.js";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { TaskDefinition } from "./task-definition.js";

/**
 * Discovers checked-in Meta Harness task definitions from the repository harness.
 */
export function discoverRepositoryTasks(repoRoot: string): TaskDefinition[] {
  const tasksRoot = join(repoRoot, "harness", "tasks");
  if (!existsSync(tasksRoot)) {
    return [];
  }
  return readdirSync(tasksRoot)
    .map((entry) => join(tasksRoot, entry))
    .filter((entryPath) => statSync(entryPath).isDirectory())
    .flatMap((taskRoot) => loadTaskDefinition(taskRoot));
}

function loadTaskDefinition(taskRoot: string): TaskDefinition[] {
  const taskTomlPath = join(taskRoot, "TASK.toml");
  if (!existsSync(taskTomlPath)) {
    return [];
  }
  const data = parseToml(readFileSync(taskTomlPath, "utf8"));
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
    actorUri: `actor://task/${sourceLibraryName}/tasks/${name}`,
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
