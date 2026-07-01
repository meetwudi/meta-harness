import { NextRequest } from "next/server";
import {
  sessionFromToken,
  switchOrganization,
  withQuartzAuthDb,
} from "../../../../lib/quartz-auth-db";
import { readQuartzSessionCookie } from "../../../../lib/quartz-auth-cookie";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Harness-Requirement: proj-quartz.organization-context-switcher
export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ organizationId: string }> },
) {
  try {
    const { organizationId } = await context.params;
    const token = await readQuartzSessionCookie();
    await withQuartzAuthDb(async (client) => {
      const session = await sessionFromToken(client, token);
      if (!session) {
        throw new Error("Sign-in is required.");
      }
      await switchOrganization(client, session, organizationId);
    });
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Organization switch failed.";
    return Response.json(
      { error: message },
      {
        status: message === "Sign-in is required." ? 401 : 400,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
