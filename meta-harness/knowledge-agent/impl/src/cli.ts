#!/usr/bin/env -S node --import tsx
// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.storage-discovery-runtime: exposes the CLI entrypoint for storage-discovered Library runs.

import { main } from "./main.js";

try {
  process.exitCode = await main();
} catch (error: unknown) {
  const message =
    error instanceof Error ? error.message : JSON.stringify(error, null, 2);
  console.error(`knowledge-agent: ${message}`);
  process.exitCode = 1;
}
