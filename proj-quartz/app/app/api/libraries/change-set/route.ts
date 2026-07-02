// Harness-Requirement: proj-quartz.library-editor-persistent-proposed-changes
// Harness-Requirement: proj-quartz.library-editor-public-proposed-changes
// Harness-Requirement: librarian.tool-librarian-list-change-sets
// Harness-Requirement: librarian.tool-librarian-abandon-change-set
// Harness-Requirement: change-sets.persistent-change-sets

import { NextRequest } from "next/server";
import {
  executeQuartzLibrarianTool,
  requestQuartzSession,
} from "../../../lib/quartz-librarian";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    const session = await requestQuartzSession();
    const output = await executeQuartzLibrarianTool(
      session,
      "librarian_list_change_sets",
      { status: "proposed" },
    );
    return Response.json(output, { headers: noStoreHeaders });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json() as { changeSet?: unknown };
    if (!body.changeSet || typeof body.changeSet !== "object" || Array.isArray(body.changeSet)) {
      throw new Error("Proposed changes payload is required.");
    }
    const session = await requestQuartzSession();
    const output = await executeQuartzLibrarianTool(
      session,
      "librarian_abandon_change_set",
      { changeSet: body.changeSet },
    );
    return Response.json(output, { headers: noStoreHeaders });
  } catch (error) {
    return jsonError(error);
  }
}

function jsonError(error: unknown): Response {
  const message = error instanceof Error
    ? publicErrorMessage(error.message)
    : "Proposed changes failed to load.";
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
