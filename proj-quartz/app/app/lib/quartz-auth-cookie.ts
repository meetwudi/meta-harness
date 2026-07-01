import { cookies } from "next/headers";

export const quartzSessionCookieName = "quartz_session";
const maxAgeSeconds = 30 * 24 * 60 * 60;

export async function readQuartzSessionCookie(): Promise<string> {
  return (await cookies()).get(quartzSessionCookieName)?.value ?? "";
}

export async function setQuartzSessionCookie(token: string): Promise<void> {
  (await cookies()).set(quartzSessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export async function clearQuartzSessionCookie(): Promise<void> {
  (await cookies()).delete(quartzSessionCookieName);
}
