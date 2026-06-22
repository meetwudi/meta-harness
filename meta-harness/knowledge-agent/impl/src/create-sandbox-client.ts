// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.provider-interface: selects the OpenAI Agents SDK sandbox client used for goal execution.

import {
  DockerSandboxClient,
  UnixLocalSandboxClient,
} from "@openai/agents/sandbox/local";

/**
 * Creates the requested OpenAI Agents SDK sandbox client for local or Docker execution.
 */
export function createSandboxClient(
  client: string,
): DockerSandboxClient | UnixLocalSandboxClient {
  if (client === "docker") {
    return new DockerSandboxClient({ image: "node:22-bookworm-slim" });
  }
  if (client === "unix") {
    return new UnixLocalSandboxClient();
  }
  throw new Error(`unknown sandbox client: ${client}`);
}
