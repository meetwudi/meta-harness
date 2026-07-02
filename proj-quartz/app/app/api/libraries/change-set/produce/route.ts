// Harness-Requirement: proj-quartz.library-editor-change-set-rendering
// Harness-Requirement: proj-quartz.library-editor-sync-workflow
// Harness-Requirement: proj-quartz.library-editor-public-proposed-changes
// Harness-Requirement: librarian.change-set-operations
// Harness-Requirement: librarian.driver-change-set-application

import { NextRequest } from "next/server";
import {
  executeQuartzLibrarianTool,
  requestQuartzSession,
} from "../../../../lib/quartz-librarian";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { changes?: unknown };
    const session = await requestQuartzSession();
    const output = await executeQuartzLibrarianTool(
      session,
      "librarian_produce_change_set",
      { changes: body.changes },
    );
    return Response.json(output, { headers: noStoreHeaders });
  } catch (error) {
    return jsonError(error);
  }
}

function jsonError(error: unknown): Response {
  const message = error instanceof Error
    ? publicErrorMessage(error.message)
    : "Proposed changes update failed.";
  return Response.json(
    { error: message },
    {
      status: message === "Sign-in is required." ? 401 : 400,
      headers: noStoreHeaders,
    },
  );
}

function publicErrorMessage(message: string): string {
  return message
    .replace(/\bchangeSet\b/g, "proposed changes")
    .replace(/\bChange set\b/g, "Proposed changes")
    .replace(/\bchange set\b/g, "proposed changes");
}
