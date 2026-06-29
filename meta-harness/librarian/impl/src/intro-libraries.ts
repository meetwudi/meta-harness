// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.intro-resource-interface: returns primitive onboarding content.
// Supports librarian.library-creation-knowledge: returns Library creation protocol content.
// Supports librarian.intro-toolspec-knowledge: returns ToolSpec primitive guidance.
// Supports storage.storage-agent-guidance: returns agent-readable storage guidance.

import { loadResolvedLibraries } from "./load-resolved-libraries.js";
import { libraryResourceUri } from "./library-resource-uri.js";
import { publicLibraryListing } from "./public-library-listing.js";
import { resolveLibraryFilePath } from "./resolve-library-file-path.js";
import type { LibrarianContext } from "./types.js";

const primitiveOnboardingLibraryUri = "library://meta-harness";
// Human explicit approval is required before changing this bootstrap knowledge list.
const introPaths = [
  "setup/PRIMITIVE-ORIENTATION.md",
  "setup/LIBRARY-CREATION.md",
  "primitives/TOOLSPEC.md",
  "storage/STORAGE.md",
];

/**
 * Returns primitive onboarding content for an agent beginning a conversation.
 */
export async function introLibraries(
  context: LibrarianContext,
): Promise<Record<string, unknown>> {
  const libraries = await loadResolvedLibraries(context);
  const onboardingLibrary = libraries.find(
    (library) => library.uri === primitiveOnboardingLibraryUri,
  );
  if (!onboardingLibrary) {
    return {
      libraryUriPatterns: [primitiveOnboardingLibraryUri],
      query: "primitive onboarding, Library creation, ToolSpec, and storage guidance",
      results: [],
    };
  }
  return {
    libraryUriPatterns: [primitiveOnboardingLibraryUri],
    query: "primitive onboarding, Library creation, ToolSpec, and storage guidance",
    results: [
      {
        library: publicLibraryListing(onboardingLibrary),
        matches: await Promise.all(
          introPaths.map(async (path) => ({
            uri: libraryResourceUri(onboardingLibrary.uri, path),
            content: await onboardingLibrary.storage.readText(
              resolveLibraryFilePath(onboardingLibrary.rootPath, path),
            ),
          })),
        ),
      },
    ],
  };
}
