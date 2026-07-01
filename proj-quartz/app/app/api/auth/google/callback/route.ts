import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import {
  createOrUpdateGoogleSession,
  quartzGoogleRedirectUri,
  quartzPublicBaseUrl,
  withQuartzAuthDb,
  type GoogleIdentityProfile,
} from "../../../../lib/quartz-auth-db";
import { setQuartzSessionCookie } from "../../../../lib/quartz-auth-cookie";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const stateCookieName = "quartz_google_oauth_state";
const nextCookieName = "quartz_google_oauth_next";

type GoogleTokenResponse = {
  id_token?: string;
  error?: string;
};

type GoogleTokenInfo = {
  sub?: string;
  email?: string;
  name?: string;
  picture?: string;
  aud?: string;
};

// Harness-Requirement: proj-quartz.google-sign-in
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(stateCookieName)?.value ?? "";
  const nextPath = cookieStore.get(nextCookieName)?.value ?? "/";
  cookieStore.delete(stateCookieName);
  cookieStore.delete(nextCookieName);

  const state = request.nextUrl.searchParams.get("state") ?? "";
  const code = request.nextUrl.searchParams.get("code") ?? "";
  if (!expectedState || state !== expectedState || !code) {
    return Response.redirect(`${quartzPublicBaseUrl()}/?auth=failed`);
  }

  const profile = await exchangeGoogleCode(code);
  const { token } = await withQuartzAuthDb((client) =>
    createOrUpdateGoogleSession(client, profile)
  );
  await setQuartzSessionCookie(token);
  return Response.redirect(`${quartzPublicBaseUrl()}${safeNextPath(nextPath)}`);
}

async function exchangeGoogleCode(code: string): Promise<GoogleIdentityProfile> {
  const clientId = process.env.QUARTZ_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.QUARTZ_GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google sign-in requires QUARTZ_GOOGLE_CLIENT_ID and QUARTZ_GOOGLE_CLIENT_SECRET.");
  }
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: quartzGoogleRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  const tokenJson = await tokenResponse.json() as GoogleTokenResponse;
  if (!tokenResponse.ok || !tokenJson.id_token) {
    throw new Error(tokenJson.error || `Google token exchange failed: ${tokenResponse.status}`);
  }
  const tokenInfoResponse = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenJson.id_token)}`,
    { cache: "no-store" },
  );
  const tokenInfo = await tokenInfoResponse.json() as GoogleTokenInfo;
  if (!tokenInfoResponse.ok || tokenInfo.aud !== clientId || !tokenInfo.sub || !tokenInfo.email) {
    throw new Error("Google identity token verification failed.");
  }
  return {
    providerSubject: tokenInfo.sub,
    email: tokenInfo.email,
    displayName: tokenInfo.name ?? "",
    avatarUrl: tokenInfo.picture ?? "",
  };
}

function safeNextPath(value: string): string {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}
