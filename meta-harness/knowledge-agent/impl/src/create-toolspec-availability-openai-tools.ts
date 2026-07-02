// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.library-toolspec-openai-tools: reports executable discovered ToolSpec tools without confusing incomplete ToolSpec knowledge with available tools.

import { tool, type Tool } from "@openai/agents";
import {
  discoverLibraryToolSpecs,
  toolSpecAllowsActor,
  type LibrarianContext,
  type ToolSpecDefinition,
} from "../../../librarian/impl/dist/index.js";

type ToolSpecAvailabilityToolInput = {
  includeUnavailable?: boolean;
};

type AvailableToolSpec = {
  name: string;
  description: string;
  implementation: string;
  implementationLoadMode: "file" | "source";
  toolSpecPath: string;
};

type UnavailableToolSpec = {
  name: string;
  description: string;
  implementation: string;
  reason: string;
  toolSpecPath: string;
};

/**
 * Creates a tool for reporting the actually executable ToolSpec tool surface.
 */
export function createToolSpecAvailabilityOpenAITools(input: {
  librarianContext: LibrarianContext;
  reservedToolNames: Set<string>;
}): Tool[] {
  const reservedToolNames = new Set(input.reservedToolNames);
  return [
    tool({
      name: "toolspec_list_available",
      description: [
        "List executable governed Library ToolSpec tools for the active actor.",
        "Call this when the user asks what tools are available, what tools you have, or which governed ToolSpec tools can be used.",
        "Only names in availableTools are currently invokable.",
        "Do not present unavailableToolSpecs as available tools.",
      ].join(" "),
      parameters: {
        type: "object",
        properties: {
          includeUnavailable: {
            type: "boolean",
            description: "Include discovered but non-invokable ToolSpecs and the reason they are unavailable.",
          },
        },
        additionalProperties: false,
      } as never,
      strict: false,
      execute: async (rawInput: unknown) =>
        listAvailableToolSpecs({
          librarianContext: input.librarianContext,
          reservedToolNames,
          includeUnavailable: objectInput(rawInput).includeUnavailable !== false,
        }),
    }),
  ];
}

export async function listAvailableToolSpecs(input: {
  librarianContext: LibrarianContext;
  reservedToolNames: Set<string>;
  includeUnavailable: boolean;
}): Promise<{
  availableTools: AvailableToolSpec[];
  unavailableToolSpecs?: UnavailableToolSpec[];
}> {
  const toolSpecs = await discoverLibraryToolSpecs(input.librarianContext);
  const availableByName = new Map<string, AvailableToolSpec>();
  const unavailableToolSpecs: UnavailableToolSpec[] = [];

  for (const toolSpec of toolSpecs) {
    const unavailableReason = toolSpecUnavailableReason(
      toolSpec,
      input.librarianContext.actorUris,
      input.reservedToolNames,
    );
    if (unavailableReason) {
      if (input.includeUnavailable) {
        unavailableToolSpecs.push(unavailableToolSpec(toolSpec, unavailableReason));
      }
      continue;
    }
    if (!availableByName.has(toolSpec.name)) {
      availableByName.set(toolSpec.name, {
        name: toolSpec.name,
        description: toolSpec.description,
        implementation: toolSpec.implementation,
        implementationLoadMode: toolSpec.implementationLoadMode,
        toolSpecPath: toolSpec.toolSpecPath,
      });
    }
  }

  return {
    availableTools: [...availableByName.values()]
      .sort((left, right) => left.name.localeCompare(right.name)),
    ...(input.includeUnavailable
      ? {
        unavailableToolSpecs: unavailableToolSpecs
          .sort((left, right) => left.name.localeCompare(right.name)),
      }
      : {}),
  };
}

function toolSpecUnavailableReason(
  toolSpec: ToolSpecDefinition,
  actorUris: string[],
  reservedToolNames: Set<string>,
): string | undefined {
  if (reservedToolNames.has(toolSpec.name)) {
    return "tool name is reserved by a built-in agent tool";
  }
  if (!toolSpecAllowsActor(toolSpec, actorUris)) {
    return "active actor identities do not match allowed_actors";
  }
  if (!toolSpec.implementationAvailable) {
    return `implementation is missing or unsupported: ${toolSpec.implementation}`;
  }
  return undefined;
}

function unavailableToolSpec(
  toolSpec: ToolSpecDefinition,
  reason: string,
): UnavailableToolSpec {
  return {
    name: toolSpec.name,
    description: toolSpec.description,
    implementation: toolSpec.implementation,
    reason,
    toolSpecPath: toolSpec.toolSpecPath,
  };
}

function objectInput(input: unknown): ToolSpecAvailabilityToolInput {
  return input && typeof input === "object" && !Array.isArray(input)
    ? input as ToolSpecAvailabilityToolInput
    : {};
}
