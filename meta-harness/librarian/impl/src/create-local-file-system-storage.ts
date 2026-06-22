// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.storage-abstraction: adapts local filesystem operations to Librarian storage.

import { makeDirectory } from "./make-directory.js";
import { deletePath } from "./delete-path.js";
import { listDirectory } from "./list-directory.js";
import { pathExists } from "./path-exists.js";
import { readTextFile } from "./read-text-file.js";
import type { LibrarianStorage } from "./types.js";
import { writeTextFile } from "./write-text-file.js";

/**
 * Creates the local filesystem storage implementation for Librarian.
 */
export function createLocalFileSystemStorage(): LibrarianStorage {
  return {
    readText: readTextFile,
    writeText: writeTextFile,
    deletePath,
    makeDirectory,
    listDirectory,
    exists: pathExists,
  };
}
