// Harness-Requirement: proj-quartz.library-editor-browse-readable
// Harness-Requirement: proj-quartz.library-editor-writable-editing
// Harness-Requirement: librarian.library-editor-librarian-boundary

import { NextRequest } from "next/server";
import {
  executeQuartzLibrarianTool,
  requestQuartzSession,
} from "../../../lib/quartz-librarian";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  try {
    const uri = request.nextUrl.searchParams.get("uri")?.trim();
    if (!uri) {
      throw new Error("uri is required.");
    }
    const session = await requestQuartzSession();
    const file = await executeQuartzLibrarianTool(
      session,
      "librarian_read",
      { uri },
    );
    return Response.json(file, { headers: noStoreHeaders });
  } catch (error) {
    return jsonError(error);
  }
}

function jsonError(error: unknown): Response {
  const message = error instanceof Error ? error.message : "Library file failed to load.";
  return Response.json(
    { error: message },
    {
      status: message === "Sign-in is required." ? 401 : 400,
      headers: noStoreHeaders,
    },
  );
}
