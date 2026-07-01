import { NextRequest } from "next/server";
import {
  createOrganization,
  sessionFromToken,
  withQuartzAuthDb,
} from "../../lib/quartz-auth-db";
import { readQuartzSessionCookie } from "../../lib/quartz-auth-cookie";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Harness-Requirement: proj-quartz.user-account-organizations
// Harness-Requirement: proj-quartz.organization-context-switcher
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { name?: string };
    const token = await readQuartzSessionCookie();
    const organization = await withQuartzAuthDb(async (client) => {
      const session = await sessionFromToken(client, token);
      if (!session) {
        throw new Error("Sign-in is required.");
      }
      return createOrganization(client, session, body.name ?? "");
    });
    return Response.json({ organization }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Organization creation failed.";
    return Response.json(
      { error: message },
      {
        status: message === "Sign-in is required." ? 401 : 400,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
