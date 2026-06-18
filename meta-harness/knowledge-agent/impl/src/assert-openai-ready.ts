// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.provider-interface: checks OpenAI provider readiness through the provider boundary.

/**
 * Verifies that the OpenAI provider has the credentials required to start a model call.
 */
export function assertOpenAIReady(): void {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for provider openai");
  }
}
