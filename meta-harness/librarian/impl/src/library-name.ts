// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.library-name-format: validates canonical Library names.

export const LIBRARY_NAME_PATTERN = "^[a-z0-9]+(?:[-_][a-z0-9]+)*$";
export const LIBRARY_NAME_FORMAT =
  "lowercase letters and digits separated by hyphens or underscores, such as anxiety-relief";

const libraryNamePattern = new RegExp(LIBRARY_NAME_PATTERN);

/**
 * Normalizes and validates a Library name.
 */
export function validateLibraryName(rawName: string, label = "Library name"): string {
  const name = rawName.trim();
  if (name !== rawName || !libraryNamePattern.test(name)) {
    throw new Error(`${label} must use ${LIBRARY_NAME_FORMAT}: ${JSON.stringify(rawName)}`);
  }
  return name;
}
