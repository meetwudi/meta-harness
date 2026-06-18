// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.library-scoped-sandbox-staging: parses Library TOML for sandbox staging.

/**
 * Parses the small TOML subset used by Meta Harness Library files.
 */
export function parseToml(text: string): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  let current: Record<string, unknown> = data;
  let pendingKey = "";
  let pendingLines: string[] = [];

  const stripComment = (line: string): string => {
    let inString = false;
    let escaped = false;
    let result = "";
    for (const char of line) {
      if (char === "\\" && inString && !escaped) {
        escaped = true;
        result += char;
        continue;
      }
      if (char === "\"" && !escaped) {
        inString = !inString;
      }
      escaped = false;
      if (char === "#" && !inString) {
        break;
      }
      result += char;
    }
    return result.trim();
  };

  const parseValue = (raw: string): unknown => {
    const value = raw.trim();
    if (value.startsWith("[") && value.endsWith("]")) {
      return JSON.parse(value.replace(/,\s*]/g, "]"));
    }
    if (value.startsWith("\"") && value.endsWith("\"")) {
      return JSON.parse(value);
    }
    if (value === "true") {
      return true;
    }
    if (value === "false") {
      return false;
    }
    return value;
  };

  const finishPending = (): void => {
    if (!pendingKey) {
      return;
    }
    current[pendingKey] = parseValue(pendingLines.join("\n"));
    pendingKey = "";
    pendingLines = [];
  };

  for (const rawLine of text.split(/\r?\n/)) {
    const line = stripComment(rawLine);
    if (!line) {
      continue;
    }
    if (pendingKey) {
      pendingLines.push(line);
      if (line.endsWith("]")) {
        finishPending();
      }
      continue;
    }
    if (line.startsWith("[[") && line.endsWith("]]")) {
      finishPending();
      const table = line.slice(2, -2).trim();
      const item: Record<string, unknown> = {};
      const existing = data[table];
      if (Array.isArray(existing)) {
        existing.push(item);
      } else {
        data[table] = [item];
      }
      current = item;
      continue;
    }
    if (line.startsWith("[") && line.endsWith("]")) {
      finishPending();
      const table = line.slice(1, -1).trim();
      const existing = data[table];
      if (existing && typeof existing === "object" && !Array.isArray(existing)) {
        current = existing as Record<string, unknown>;
      } else {
        current = {};
        data[table] = current;
      }
      continue;
    }
    const equals = line.indexOf("=");
    if (equals < 0) {
      continue;
    }
    const key = line.slice(0, equals).trim();
    const value = line.slice(equals + 1).trim();
    if (value.startsWith("[") && !value.endsWith("]")) {
      pendingKey = key;
      pendingLines = [value];
      continue;
    }
    current[key] = parseValue(value);
  }
  finishPending();
  return data;
}
