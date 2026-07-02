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
import {
  executeQuartzLibrarianTool,
  requestQuartzSession,
} from "../../lib/quartz-librarian";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Harness-Requirement: proj-quartz.api.key-authentication
// Harness-Requirement: proj-quartz.api.key-actor-scope
// Harness-Requirement: proj-quartz.api.production-library-listing
// Harness-Requirement: proj-quartz.api.project-storage
// Harness-Requirement: proj-quartz.library-editor-browse-readable
// Harness-Requirement: proj-quartz.library-editor-actor-context-filter
// Harness-Requirement: librarian.library-editor-librarian-boundary
export async function GET(request: NextRequest) {
  try {
    const apiToken = bearerTokenOrNull(request);
    if (apiToken) {
      const authentication = await authenticateApiRequest(apiToken);
      const libraries = await listQuartzLibraries(authentication.actorContext);
      return Response.json(libraries, { headers: { "Cache-Control": "no-store" } });
    }
    const session = await requestQuartzSession();
    const list = await executeQuartzLibrarianTool(
      session,
      "librarian_list_libraries",
      {},
    );
    return Response.json(
      {
        ...objectOutput(list),
        activeOrganizationActorUri: session.activeOrganization?.actorUri ?? null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
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
    const authentication = await authenticateApiRequest(requiredBearerToken(request));
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

async function authenticateApiRequest(token: string) {
  return withQuartzAuthDb(async (client) => {
    const authentication = await authenticateApiKey(client, token);
    if (!authentication) {
      throw new Error("Valid API key is required.");
    }
    return authentication;
  });
}

function requiredBearerToken(request: NextRequest): string {
  const token = bearerTokenOrNull(request);
  if (!token) {
    throw new Error("Valid API key is required.");
  }
  return token;
}

function bearerTokenOrNull(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) {
    return null;
  }
  return match[1];
}

function objectOutput(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Librarian list response was malformed.");
  }
  return value as Record<string, unknown>;
}

function apiError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = message === "Valid API key is required." || message === "Sign-in is required."
    ? 401
    : 400;
  return Response.json(
    { error: message },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
