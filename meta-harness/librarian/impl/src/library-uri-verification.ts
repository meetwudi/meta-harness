// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.library-uri-verification: verifies Library URI inputs against resolved Libraries.
// Supports librarian.resource-uri-tool-inputs: keeps Library resource URI inputs canonical.

import { libraryResourceUri } from "./library-resource-uri.js";
import type { ResolvedLibrary } from "./types.js";

/**
 * Verifies that an exact Library URI input uses the Library URI scheme.
 */
export function verifyLibraryUriInput(uri: string, label = "uri"): string {
  if (uri !== uri.trim()) {
    throw new Error(`${label} must not include surrounding whitespace: ${uri}`);
  }
  if (!uri.startsWith("library://")) {
    throw new Error(`${label} must start with library://: ${uri}`);
  }
  if (uri.endsWith("/")) {
    throw new Error(`${label} must be canonical and must not end with a slash: ${uri}`);
  }
  const remainder = uri.slice("library://".length);
  if (!remainder) {
    throw new Error(`${label} must include a Library name: ${uri}`);
  }
  const segments = remainder.split("/");
  if (!segments[0]) {
    throw new Error(`${label} must include a Library name: ${uri}`);
  }
  for (const segment of segments.slice(1)) {
    if (!segment || segment === "." || segment === "..") {
      throw new Error(`${label} must use canonical Library-relative path segments: ${uri}`);
    }
  }
  return uri;
}

/**
 * Verifies that a resolved Library location still matches its canonical resource URI.
 */
export function verifyResolvedLibraryLocationUri(
  inputUri: string,
  library: ResolvedLibrary,
  path: string,
): void {
  const canonicalUri = libraryResourceUri(library.uri, path);
  if (inputUri !== canonicalUri) {
    throw new Error(`Library URI must resolve to the actual canonical Library URI ${canonicalUri}: ${inputUri}`);
  }
}

/**
 * Verifies exact Library URI filters against resolved Libraries.
 */
export function verifyLibraryUris(
  uris: string[],
  libraries: ResolvedLibrary[],
  label = "libraryUris",
): void {
  for (const uri of uris) {
    const exactUri = verifyLibraryUriInput(uri, `${label} entry`);
    if (!libraries.some((library) => library.uri === exactUri)) {
      throw new Error(`Unknown Library URI: ${uri}`);
    }
  }
}

/**
 * Verifies exact Library URI patterns while allowing wildcard Library URI patterns.
 */
export function verifyLibraryUriPatterns(
  patterns: string[],
  libraries: ResolvedLibrary[],
  label = "libraryUriPatterns",
): void {
  if (patterns.length === 0) {
    throw new Error(`${label} requires at least one Library URI pattern`);
  }
  for (const pattern of patterns) {
    if (pattern !== pattern.trim()) {
      throw new Error(`${label} entries must not include surrounding whitespace: ${pattern}`);
    }
    if (!pattern.startsWith("library://")) {
      throw new Error(`${label} entries must start with library://: ${pattern}`);
    }
    if (pattern.includes("*")) {
      continue;
    }
    const exactUri = verifyLibraryUriInput(pattern, `${label} entry`);
    if (!libraries.some((library) => library.uri === exactUri)) {
      throw new Error(`Unknown Library URI: ${pattern}`);
    }
  }
}
