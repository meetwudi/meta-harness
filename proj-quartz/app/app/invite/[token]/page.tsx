"use client";

import { Building2, Check, UserRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type QuartzInvite = {
  email: string;
  organization_name: string;
  accepted_at: string | null;
  expires_at: string;
};

type QuartzSession = {
  user: {
    email: string;
    displayName: string;
  };
};

async function parseJsonResponse(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  const json = text.trim() ? JSON.parse(text) as Record<string, unknown> : {};
  if (!response.ok) {
    const message = typeof json.error === "string"
      ? json.error
      : `Request failed with ${response.status}.`;
    throw new Error(message);
  }
  return json;
}

function inviteFromApi(value: unknown): QuartzInvite | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const invite = record.invite;
  if (!invite || typeof invite !== "object" || Array.isArray(invite)) {
    return null;
  }
  const candidate = invite as Record<string, unknown>;
  if (
    typeof candidate.email !== "string" ||
    typeof candidate.organization_name !== "string" ||
    typeof candidate.expires_at !== "string"
  ) {
    return null;
  }
  return {
    email: candidate.email,
    organization_name: candidate.organization_name,
    accepted_at: typeof candidate.accepted_at === "string"
      ? candidate.accepted_at
      : null,
    expires_at: candidate.expires_at,
  };
}

function sessionFromApi(value: unknown): QuartzSession | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const session = (value as Record<string, unknown>).session;
  if (!session || typeof session !== "object" || Array.isArray(session)) {
    return null;
  }
  const user = (session as Record<string, unknown>).user;
  if (!user || typeof user !== "object" || Array.isArray(user)) {
    return null;
  }
  const userRecord = user as Record<string, unknown>;
  if (typeof userRecord.email !== "string" || typeof userRecord.displayName !== "string") {
    return null;
  }
  return {
    user: {
      email: userRecord.email,
      displayName: userRecord.displayName,
    },
  };
}

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const token = useMemo(() => params.token ?? "", [params.token]);
  const [invite, setInvite] = useState<QuartzInvite | null>(null);
  const [session, setSession] = useState<QuartzSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [accepted, setAccepted] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setStatus("");
    try {
      const [inviteJson, sessionJson] = await Promise.all([
        parseJsonResponse(await fetch(`/api/invites/${encodeURIComponent(token)}`, {
          cache: "no-store",
        })),
        parseJsonResponse(await fetch("/api/auth/session", { cache: "no-store" })),
      ]);
      setInvite(inviteFromApi(inviteJson));
      setSession(sessionFromApi(sessionJson));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Invite failed to load.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      void load();
    }
  }, [load, token]);

  const signIn = useCallback(() => {
    window.location.href = `/api/auth/google/start?next=${encodeURIComponent(`/invite/${token}`)}`;
  }, [token]);

  const accept = useCallback(async () => {
    setStatus("");
    try {
      await parseJsonResponse(
        await fetch(`/api/invites/${encodeURIComponent(token)}/accept`, {
          method: "POST",
        }),
      );
      setAccepted(true);
      setStatus("Invite accepted.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Invite acceptance failed.");
    }
  }, [token]);

  return (
    <main className="quartz-invite-page">
      <section className="quartz-invite-panel" aria-busy={loading}>
        <Building2 aria-hidden="true" size={26} strokeWidth={1.9} />
        <h1>{invite?.organization_name ?? "Quartz invite"}</h1>
        {invite ? (
          <p>
            Invitation for {invite.email}
          </p>
        ) : (
          <p>{loading ? "Loading invite..." : "Invite unavailable."}</p>
        )}

        {session ? (
          <div className="quartz-invite-account">
            <UserRound aria-hidden="true" size={17} strokeWidth={1.9} />
            <span>{session.user.displayName || session.user.email}</span>
            <strong>{session.user.email}</strong>
          </div>
        ) : null}

        {!session ? (
          <button type="button" onClick={signIn} disabled={loading}>
            Continue with Google
          </button>
        ) : accepted || invite?.accepted_at ? (
          <a href="/">
            <Check aria-hidden="true" size={16} strokeWidth={1.9} />
            Open Quartz
          </a>
        ) : (
          <button type="button" onClick={accept} disabled={loading || !invite}>
            Accept invite
          </button>
        )}

        {status ? <div className="quartz-invite-status" role="status">{status}</div> : null}
      </section>
    </main>
  );
}
