import { NextRequest } from "next/server";
import {
  acceptInvite,
  sessionFromToken,
  withQuartzAuthDb,
} from "../../../../lib/quartz-auth-db";
import { readQuartzSessionCookie } from "../../../../lib/quartz-auth-cookie";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Harness-Requirement: proj-quartz.organization-invite-flow
export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;
    const sessionToken = await readQuartzSessionCookie();
    const organization = await withQuartzAuthDb(async (client) => {
      const session = await sessionFromToken(client, sessionToken);
      if (!session) {
        throw new Error("Sign-in is required.");
      }
      return acceptInvite(client, session, token);
    });
    return Response.json({ organization }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invite acceptance failed.";
    return Response.json(
      { error: message },
      {
        status: message === "Sign-in is required." ? 401 : 400,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
