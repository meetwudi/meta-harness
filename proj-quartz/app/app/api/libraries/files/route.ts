// Harness-Requirement: proj-quartz.library-editor-browse-readable
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
    const uri = request.nextUrl.searchParams.get("libraryUri")?.trim();
    if (!uri) {
      throw new Error("libraryUri is required.");
    }
    const session = await requestQuartzSession();
    const files = await executeQuartzLibrarianTool(
      session,
      "librarian_list_files",
      { uri, recursive: true },
    );
    return Response.json(files, { headers: noStoreHeaders });
  } catch (error) {
    return jsonError(error);
  }
}

function jsonError(error: unknown): Response {
  const message = error instanceof Error ? error.message : "Library files failed to load.";
  return Response.json(
    { error: message },
    {
      status: message === "Sign-in is required." ? 401 : 400,
      headers: noStoreHeaders,
    },
  );
}
