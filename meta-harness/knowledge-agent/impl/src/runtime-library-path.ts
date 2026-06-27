// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.runtime-library-configuration: resolves runtime Library roots from project knowledge.

import { isAbsolute, resolve } from "node:path";

export type RuntimeLibraryPathValues = {
  repoRootPath: string;
  projectRootPath: string;
  localRoot: string;
  tmpStorageLibrariesRoot: string;
};

/**
 * Resolves a runtime Library root path from project-configured path tokens.
 */
export function resolveRuntimeLibraryRootPath(
  value: string,
  values: RuntimeLibraryPathValues,
): string {
  const replaced = Object.entries(values).reduce(
    (current, [key, replacement]) => current.replaceAll(`{{${key}}}`, replacement),
    value,
  );
  const unresolved = replaced.match(/{{[^}]+}}/);
  if (unresolved) {
    throw new Error(`Unsupported runtime Library root path token: ${unresolved[0]}`);
  }
  return isAbsolute(replaced) ? resolve(replaced) : resolve(values.repoRootPath, replaced);
}
