// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.storage-discovery-runtime: reads storage-discovery CLI inputs.
// Supports knowledge-agent.provider-interface: reads provider, model, and sandbox selection inputs.

import {
  DEFAULT_CLIENT,
  DEFAULT_PROVIDER,
} from "./constants.js";
import { defaultConversationId } from "./default-conversation-id.js";
import { defaultTurnId } from "./default-turn-id.js";
import type { Args } from "./types.js";

/**
 * Parses Knowledge Agent CLI arguments and environment defaults into runtime options.
 */
export function parseArgs(argv: string[]): Args {
  const args: Args = {
    repoRoot: process.cwd(),
    provider: process.env.KNOWLEDGE_AGENT_PROVIDER ?? DEFAULT_PROVIDER,
    model: process.env.KNOWLEDGE_AGENT_MODEL,
    client: process.env.KNOWLEDGE_AGENT_SANDBOX_CLIENT ?? DEFAULT_CLIENT,
    conversationId: defaultConversationId(),
    turnId: defaultTurnId(),
    localRoot: "",
    sandboxWorkspace: "",
  };

  const rest = [...argv];
  args.command = rest.shift();
  while (rest.length > 0) {
    const flag = rest.shift();
    const value = rest.shift();
    if (!flag?.startsWith("--") || value === undefined) {
      throw new Error(`invalid argument: ${flag ?? ""}`);
    }
    switch (flag) {
      case "--repo-root":
        args.repoRoot = value;
        break;
      case "--goal":
        args.goal = value;
        break;
      case "--provider":
        args.provider = value;
        break;
      case "--model":
        args.model = value;
        break;
      case "--client":
        args.client = value;
        break;
      case "--conversation-id":
        args.conversationId = value;
        break;
      case "--turn-id":
        args.turnId = value;
        break;
      case "--local-root":
        args.localRoot = value;
        break;
      case "--sandbox-workspace":
        args.sandboxWorkspace = value;
        break;
      default:
        throw new Error(`unknown option: ${flag}`);
    }
  }
  return args;
}
