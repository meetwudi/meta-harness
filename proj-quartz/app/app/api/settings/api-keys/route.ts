import { NextRequest } from "next/server";
import {
  createApiKey,
  listApiKeys,
  sessionFromToken,
  withQuartzAuthDb,
  type QuartzApiKeyActorScope,
} from "../../../lib/quartz-auth-db";
import { readQuartzSessionCookie } from "../../../lib/quartz-auth-cookie";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Harness-Requirement: proj-quartz.api.key-authentication
// Harness-Requirement: proj-quartz.api.key-settings-dialog
// Harness-Requirement: proj-quartz.api.key-actor-scope
// Harness-Requirement: proj-quartz.api.project-storage
export async function GET() {
  try {
    const token = await readQuartzSessionCookie();
    const apiKeys = await withQuartzAuthDb(async (client) => {
      const session = await sessionFromToken(client, token);
      if (!session) {
        throw new Error("Sign-in is required.");
      }
      return listApiKeys(client, session);
    });
    return Response.json({ apiKeys }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return settingsError(error, "API key listing failed.");
  }
}

// Harness-Requirement: proj-quartz.api.key-authentication
// Harness-Requirement: proj-quartz.api.key-settings-dialog
// Harness-Requirement: proj-quartz.api.key-actor-scope
// Harness-Requirement: proj-quartz.api.project-storage
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      label?: string;
      actorScope?: QuartzApiKeyActorScope;
      organizationId?: string;
    };
    const token = await readQuartzSessionCookie();
    const result = await withQuartzAuthDb(async (client) => {
      const session = await sessionFromToken(client, token);
      if (!session) {
        throw new Error("Sign-in is required.");
      }
      return createApiKey({
        client,
        session,
        label: body.label ?? "",
        actorScope: body.actorScope,
        organizationId: body.organizationId,
      });
    });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return settingsError(error, "API key creation failed.");
  }
}

function settingsError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  return Response.json(
    { error: message },
    {
      status: message === "Sign-in is required." ? 401 : 400,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
