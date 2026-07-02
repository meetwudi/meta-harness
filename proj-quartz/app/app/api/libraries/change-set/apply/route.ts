// Harness-Requirement: proj-quartz.library-editor-change-set-rendering
// Harness-Requirement: proj-quartz.library-editor-sync-workflow
// Harness-Requirement: proj-quartz.library-editor-conflict-rebase
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
    const output = parseApplyOutput(await executeQuartzLibrarianTool(
      session,
      "librarian_apply_change_set",
      { changeSet },
    ));
    if (output.applied === false) {
      return Response.json(
        {
          error: "Proposed changes need reconciliation before apply.",
          ...output,
        },
        { status: 409, headers: noStoreHeaders },
      );
    }
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

function parseApplyOutput(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Librarian proposed changes response was malformed.");
  }
  const record = value as Record<string, unknown>;
  if (record.applied === false) {
    if (!Array.isArray(record.checks) || !Array.isArray(record.conflicts)) {
      throw new Error("Librarian proposed changes response was malformed.");
    }
    return record;
  }
  if (
    record.applied !== true ||
    typeof record.changeSetId !== "string" ||
    !Array.isArray(record.checks) ||
    !Array.isArray(record.appliedChanges) ||
    !record.appliedChanges.every(isAppliedChange)
  ) {
    throw new Error("Librarian proposed changes response was malformed.");
  }
  return record;
}

function isAppliedChange(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.uri === "string" &&
    typeof record.sha256 === "string" &&
    typeof record.bytesWritten === "number";
}

function jsonError(error: unknown): Response {
  const message = error instanceof Error
    ? publicErrorMessage(error.message)
    : "Proposed changes apply failed.";
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
