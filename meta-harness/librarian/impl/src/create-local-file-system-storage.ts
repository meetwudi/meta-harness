// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.storage-abstraction: adapts local filesystem operations to Librarian storage.
// Harness-Requirement: librarian.driver-change-set-application

import { makeDirectory } from "./make-directory.js";
import { deletePath } from "./delete-path.js";
import { listDirectory } from "./list-directory.js";
import { pathExists } from "./path-exists.js";
import { readTextFile } from "./read-text-file.js";
import {
  applyStorageChangeSet,
  listStorageChangeSets,
  persistStorageChangeSet,
  previewStorageChangeSetApply,
  readStorageChangeSetBaseline,
  readStorageChangeSet,
} from "./storage-change-set-hooks.js";
import type { LibrarianStorage } from "./types.js";
import { writeTextFile } from "./write-text-file.js";

/**
 * Creates the local filesystem storage implementation for Librarian.
 */
export function createLocalFileSystemStorage(): LibrarianStorage {
  const storage: LibrarianStorage = {
    readText: readTextFile,
    writeText: writeTextFile,
    deletePath,
    makeDirectory,
    listDirectory,
    exists: pathExists,
  };
  return {
    ...storage,
    readChangeSetBaseline: (path) => readStorageChangeSetBaseline(storage, path),
    previewChangeSetApply: (changes) => previewStorageChangeSetApply(storage, changes),
    applyChangeSet: (changes) => applyStorageChangeSet(storage, changes),
    persistChangeSet: (storePath, record) => persistStorageChangeSet(storage, storePath, record),
    listChangeSets: (storePath, input) => listStorageChangeSets(storage, storePath, input),
    readChangeSet: (storePath, changeSetId) => readStorageChangeSet(storage, storePath, changeSetId),
  };
}
