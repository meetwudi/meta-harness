// Harness-Requirement: proj-quartz.library-editor-shared-change-checks
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
    const body = await request.json() as { changeSet?: unknown };
    if (!body.changeSet || typeof body.changeSet !== "object" || Array.isArray(body.changeSet)) {
      throw new Error("Proposed changes payload is required.");
    }
    const changeSet = stripClientComplianceReviews(body.changeSet);
    const session = await requestQuartzSession();
    const output = parseValidationOutput(await executeQuartzLibrarianTool(
      session,
      "librarian_validate_change_set",
      { changeSet },
    ));
    return Response.json(output, { headers: noStoreHeaders });
  } catch (error) {
    return jsonError(error);
  }
}

function stripClientComplianceReviews(changeSet: object): Record<string, unknown> {
  return {
    ...(changeSet as Record<string, unknown>),
    complianceReviews: [],
  };
}

function parseValidationOutput(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Librarian proposed changes validation response was malformed.");
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.changeSetId !== "string" ||
    typeof record.clean !== "boolean" ||
    !Array.isArray(record.checks) ||
    !Array.isArray(record.conflicts)
  ) {
    throw new Error("Librarian proposed changes validation response was malformed.");
  }
  return record;
}

function jsonError(error: unknown): Response {
  const message = error instanceof Error
    ? publicErrorMessage(error.message)
    : "Proposed changes validation failed.";
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
