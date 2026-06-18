// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.library-index-goal-input: documents the required CLI shape for Library index and goal.

/**
 * Builds the CLI usage text shown for invalid or incomplete commands.
 */
export function usage(): string {
  return [
    "Usage:",
    "  knowledge-agent run --library-index <path> --goal <goal>",
    "",
    "Options:",
    "  --provider <name>              Provider name. Default: openai",
    "  --model <model>                Provider model. Default: provider cheap model",
    "  --client <unix|docker>         Sandbox client. Default: unix",
    "  --repo-root <path>             Repository root. Default: discovered from cwd",
    "  --conversation-id <id>         Conversation id. Default: generated",
    "  --local-root <path>            Project local root. Default: .meta-harness.json project.localRoot",
    "  --sandbox-workspace <path>     Local sandbox workspace directory",
  ].join("\n");
}
