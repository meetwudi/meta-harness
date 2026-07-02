// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.library-toolspec-openai-tools: resolves discovered ToolSpec implementations without per-tool OpenAI adapter branches.
// Compliance: keep implementation resolution generic; do not branch on concrete tool names, implementation tokens, or implementation file names.

import { Buffer } from "node:buffer";
import { pathToFileURL } from "node:url";
import type { ToolSpecDefinition } from "../../../librarian/impl/dist/index.js";

type ToolSpecExecute = (
  input: Record<string, unknown>,
  toolSpec: ToolSpecDefinition,
) => Promise<unknown> | unknown;

type ToolSpecImplementationModule = {
  executeToolSpec?: unknown;
  execute?: unknown;
  default?: unknown;
};

/**
 * Executes the implementation referenced by a discovered ToolSpec.
 */
export async function executeToolSpecImplementation(
  toolSpec: ToolSpecDefinition,
  input: Record<string, unknown>,
): Promise<unknown> {
  const moduleUrl = resolveToolSpecImplementationModuleUrl(toolSpec);
  let implementationModule: ToolSpecImplementationModule;
  try {
    implementationModule = await import(moduleUrl.href) as ToolSpecImplementationModule;
  } catch (error) {
    throw new Error(
      `Failed to load ToolSpec implementation for ${toolSpec.name} from ${moduleUrl.href}: ${errorMessage(error)}`,
    );
  }
  const execute = toolSpecExecuteFunction(implementationModule, toolSpec);
  return execute(input, toolSpec);
}

/**
 * Resolves a ToolSpec implementation reference to a loadable module URL.
 */
export function resolveToolSpecImplementationModuleUrl(
  toolSpec: ToolSpecDefinition,
): URL {
  if (!toolSpec.implementationAvailable) {
    throw new Error(
      `ToolSpec implementation is missing for ${toolSpec.name}: ${toolSpec.implementation}`,
    );
  }
  if (toolSpec.implementationLoadMode === "source") {
    if (typeof toolSpec.implementationContent !== "string") {
      throw new Error(
        `ToolSpec implementation content is missing for ${toolSpec.name}: ${toolSpec.implementation}`,
      );
    }
    return toolSpecImplementationSourceUrl(toolSpec);
  }
  return pathToFileURL(toolSpec.implementationPath);
}

function toolSpecImplementationSourceUrl(toolSpec: ToolSpecDefinition): URL {
  const source = `${toolSpec.implementationContent}\n//# sourceURL=${sourceUrlLabel(toolSpec)}`;
  return new URL(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}

function sourceUrlLabel(toolSpec: ToolSpecDefinition): string {
  return toolSpec.implementationPath.replace(/\s/g, "_");
}

function toolSpecExecuteFunction(
  implementationModule: ToolSpecImplementationModule,
  toolSpec: ToolSpecDefinition,
): ToolSpecExecute {
  const candidate = implementationModule.executeToolSpec
    ?? implementationModule.execute
    ?? implementationModule.default;
  if (typeof candidate !== "function") {
    throw new Error(
      `ToolSpec implementation for ${toolSpec.name} must export executeToolSpec, execute, or a default function.`,
    );
  }
  return candidate as ToolSpecExecute;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
