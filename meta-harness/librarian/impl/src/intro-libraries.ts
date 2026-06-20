// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.intro-resource-interface: returns primitive onboarding content.

import { loadResolvedLibraries } from "./load-resolved-libraries.js";
import { libraryResourceUri } from "./library-resource-uri.js";
import { publicLibraryListing } from "./public-library-listing.js";
import { resolveLibraryFilePath } from "./resolve-library-file-path.js";
import type { LibrarianContext } from "./types.js";

const primitiveOnboardingLibraryUri = "library://meta-harness";
const primitiveOnboardingPath = "setup/PRIMITIVE-ORIENTATION.md";

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
      query: "primitive onboarding",
      results: [],
    };
  }
  const filePath = resolveLibraryFilePath(
    onboardingLibrary.rootPath,
    primitiveOnboardingPath,
  );
  return {
    libraryUriPatterns: [primitiveOnboardingLibraryUri],
    query: "primitive onboarding",
    results: [
      {
        library: publicLibraryListing(onboardingLibrary),
        matches: [
          {
            uri: libraryResourceUri(onboardingLibrary.uri, primitiveOnboardingPath),
            content: await context.storage.readText(filePath),
          },
        ],
      },
    ],
  };
}
