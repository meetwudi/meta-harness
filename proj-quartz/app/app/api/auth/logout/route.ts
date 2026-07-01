import {
  revokeSession,
  withQuartzAuthDb,
} from "../../../lib/quartz-auth-db";
import {
  clearQuartzSessionCookie,
  readQuartzSessionCookie,
} from "../../../lib/quartz-auth-cookie";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Harness-Requirement: proj-quartz.google-sign-in
export async function POST() {
  const token = await readQuartzSessionCookie();
  await withQuartzAuthDb((client) => revokeSession(client, token));
  await clearQuartzSessionCookie();
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
