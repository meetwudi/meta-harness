// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.storage-discovery-runtime: documents the storage-discovery CLI shape.
// Supports knowledge-agent.project-config-selection: documents project config selection.

/**
 * Builds the CLI usage text shown for invalid or incomplete commands.
 */
export function usage(): string {
  return [
    "Usage:",
    "  knowledge-agent run --goal <goal>",
    "  knowledge-agent chat",
    "",
    "Options:",
    "  --provider <name>              Provider name. Default: openai",
    "  --model <model>                Provider model. Default: provider cheap model",
    "  --client <unix|docker>         Sandbox client. Default: unix",
    "  --repo-root <path>             Repository root. Default: discovered from cwd",
    "  --project-config <path>        Project config path. Default: .meta-harness.json",
    "  --conversation-id <id>         Conversation id. Default: generated",
    "  --turn-id <id>                 Turn id for one-off run. Default: generated",
    "  --local-root <path>            Project local root. Default: .meta-harness.json project.localRoot",
    "  --sandbox-workspace <path>     Local sandbox workspace directory",
  ].join("\n");
}
