import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import {
  loadQuartzProjectEnv,
  quartzGoogleRedirectUri,
} from "../../../../lib/quartz-auth-db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const stateCookieName = "quartz_google_oauth_state";
const nextCookieName = "quartz_google_oauth_next";

// Harness-Requirement: proj-quartz.google-sign-in
export async function GET(request: NextRequest) {
  loadQuartzProjectEnv();
  const clientId = process.env.QUARTZ_GOOGLE_CLIENT_ID;
  if (!clientId) {
    return Response.json(
      { error: "QUARTZ_GOOGLE_CLIENT_ID is required for Google sign-in." },
      { status: 500 },
    );
  }
  const state = randomBytes(24).toString("base64url");
  const nextPath = safeNextPath(request.nextUrl.searchParams.get("next") ?? "/");
  const cookieStore = await cookies();
  cookieStore.set(stateCookieName, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  cookieStore.set(nextCookieName, nextPath, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", quartzGoogleRedirectUri());
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "select_account");
  return Response.redirect(authUrl);
}

function safeNextPath(value: string): string {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export { stateCookieName, nextCookieName };
