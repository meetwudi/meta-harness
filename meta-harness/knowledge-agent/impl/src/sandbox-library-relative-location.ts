// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.library-scoped-sandbox-staging: chooses where Libraries appear in the sandbox repo.

import { isAbsolute, relative } from "node:path";
import { safeLibraryFolderName } from "./safe-library-folder-name.js";

/**
 * Returns the sandbox repository-relative location for a resolved Library source.
 */
export function sandboxLibraryRelativeLocation(
  repoRoot: string,
  sourcePath: string,
  name: string,
): string {
  const repoRelative = relative(repoRoot, sourcePath);
  if (repoRelative && !repoRelative.startsWith("..") && !isAbsolute(repoRelative)) {
    return repoRelative.split("\\").join("/");
  }
  if (!repoRelative) {
    return ".";
  }
  return `.knowledge-agent-libraries/${safeLibraryFolderName(name)}`;
}
