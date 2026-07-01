import { NextRequest } from "next/server";
import {
  authenticateApiKey,
  withQuartzAuthDb,
} from "../../lib/quartz-auth-db";
import {
  ingestQuartzLibrary,
  listQuartzLibraries,
  type QuartzLibraryIngestInput,
} from "../../lib/quartz-api-libraries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Harness-Requirement: proj-quartz.api.key-authentication
// Harness-Requirement: proj-quartz.api.key-actor-scope
// Harness-Requirement: proj-quartz.api.production-library-listing
// Harness-Requirement: proj-quartz.api.project-storage
export async function GET(request: NextRequest) {
  try {
    const authentication = await authenticateApiRequest(request);
    const libraries = await listQuartzLibraries(authentication.actorContext);
    return Response.json(libraries, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error, "Library listing failed.");
  }
}

// Harness-Requirement: proj-quartz.api.key-authentication
// Harness-Requirement: proj-quartz.api.key-actor-scope
// Harness-Requirement: proj-quartz.api.library-ingest
// Harness-Requirement: proj-quartz.api.project-storage
export async function POST(request: NextRequest) {
  try {
    const authentication = await authenticateApiRequest(request);
    const body = await request.json() as Partial<QuartzLibraryIngestInput>;
    const result = await ingestQuartzLibrary(authentication.actorContext, {
      name: body.name ?? "",
      description: body.description ?? "",
      files: Array.isArray(body.files) ? body.files : [],
    });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error, "Library ingest failed.");
  }
}

async function authenticateApiRequest(request: NextRequest) {
  const token = bearerToken(request);
  return withQuartzAuthDb(async (client) => {
    const authentication = await authenticateApiKey(client, token);
    if (!authentication) {
      throw new Error("Valid API key is required.");
    }
    return authentication;
  });
}

function bearerToken(request: NextRequest): string {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) {
    throw new Error("Valid API key is required.");
  }
  return match[1];
}

function apiError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = message === "Valid API key is required." ? 401 : 400;
  return Response.json(
    { error: message },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
