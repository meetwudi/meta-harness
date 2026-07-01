import { NextRequest } from "next/server";
import {
  createOrganizationInvite,
  sessionFromToken,
  withQuartzAuthDb,
} from "../../../../lib/quartz-auth-db";
import { readQuartzSessionCookie } from "../../../../lib/quartz-auth-cookie";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Harness-Requirement: proj-quartz.organization-invite-flow
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ organizationId: string }> },
) {
  try {
    const { organizationId } = await context.params;
    const body = await request.json() as { email?: string };
    const token = await readQuartzSessionCookie();
    const delivery = await withQuartzAuthDb(async (client) => {
      const session = await sessionFromToken(client, token);
      if (!session) {
        throw new Error("Sign-in is required.");
      }
      return createOrganizationInvite({
        client,
        session,
        organizationId,
        email: body.email ?? "",
      });
    });
    return Response.json({ delivery }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invite creation failed.";
    return Response.json(
      { error: message },
      {
        status: message === "Sign-in is required." ? 401 : 400,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
