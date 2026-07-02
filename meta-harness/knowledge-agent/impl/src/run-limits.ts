// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.main-run-turn-budget: centralizes configured OpenAI SDK turn budgets.

export const MAIN_RUN_MAX_TURNS = null;
export const MEMORY_CURATOR_MAX_TURNS = 12;

export function configuredRunLimits(): Record<string, number | null> {
  return {
    mainMaxTurns: MAIN_RUN_MAX_TURNS,
    memoryCuratorMaxTurns: MEMORY_CURATOR_MAX_TURNS,
  };
}
