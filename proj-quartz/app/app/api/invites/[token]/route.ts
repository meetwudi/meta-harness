import { NextRequest } from "next/server";
import { loadInvite, withQuartzAuthDb } from "../../../lib/quartz-auth-db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Harness-Requirement: proj-quartz.organization-invite-flow
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;
    const invite = await withQuartzAuthDb((client) => loadInvite(client, token));
    return Response.json({ invite }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invite lookup failed.";
    return Response.json(
      { error: message },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
