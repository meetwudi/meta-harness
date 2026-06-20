// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.shamanistic-library-tools: keeps search output compact for agents.

/**
 * Returns a short snippet around a query match from file content.
 */
export function contentSnippet(content: string, query: string): string {
  const limit = 800;
  const lower = content.toLowerCase();
  const index = lower.indexOf(query.toLowerCase());
  if (index < 0) {
    return content.slice(0, limit);
  }
  const start = Math.max(0, index - 200);
  return content.slice(start, start + limit);
}
