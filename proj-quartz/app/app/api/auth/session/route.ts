import {
  sessionFromToken,
  withQuartzAuthDb,
} from "../../../lib/quartz-auth-db";
import { readQuartzSessionCookie } from "../../../lib/quartz-auth-cookie";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Harness-Requirement: proj-quartz.google-sign-in
// Harness-Requirement: proj-quartz.organization-context-switcher
export async function GET() {
  const token = await readQuartzSessionCookie();
  const session = await withQuartzAuthDb((client) => sessionFromToken(client, token));
  return Response.json({ session }, { headers: { "Cache-Control": "no-store" } });
}
