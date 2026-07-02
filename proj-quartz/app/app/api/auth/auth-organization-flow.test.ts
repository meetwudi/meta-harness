import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import {
  acceptInvite,
  createOrganization,
  createOrganizationInvite,
  createOrUpdateGoogleSession,
  revokeSession,
  sessionFromToken,
  switchOrganization,
  withQuartzAuthDb,
  type QuartzQueryClient,
} from "../../lib/quartz-auth-db";

// Harness-Requirement: proj-quartz.auth-storage
// Harness-Requirement: proj-quartz.google-sign-in
// Harness-Requirement: proj-quartz.organization-context-switcher
// Harness-Requirement: proj-quartz.organization-invite-flow
// Harness-Requirement: proj-quartz.organization-profiles
// Harness-Requirement: proj-quartz.organization-resource-actors
// Harness-Requirement: proj-quartz.user-account-organizations

type WebhookPayload = {
  to: string;
  subject: string;
  text: string;
};

type ResendRequest = {
  url: string;
  authorization: string;
  body: {
    from?: string;
    to?: string[];
    subject?: string;
    text?: string;
    html?: string;
  };
};

async function readRequestJson(request: IncomingMessage): Promise<WebhookPayload> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as WebhookPayload;
}

async function withInviteWebhook<T>(
  run: (input: { url: string; deliveries: WebhookPayload[] }) => Promise<T>,
): Promise<T> {
  const deliveries: WebhookPayload[] = [];
  const server = createServer((request: IncomingMessage, response: ServerResponse) => {
    void (async () => {
      if (request.method !== "POST") {
        response.writeHead(405);
        response.end();
        return;
      }
      deliveries.push(await readRequestJson(request));
      response.writeHead(204);
      response.end();
    })().catch((error: unknown) => {
      response.writeHead(500);
      response.end(error instanceof Error ? error.message : "Webhook failed.");
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  assert(address && typeof address === "object");
  try {
    return await run({
      url: `http://127.0.0.1:${address.port}/invite-email`,
      deliveries,
    });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error?: Error) => error ? reject(error) : resolve());
    });
  }
}

async function cleanupTestRows(
  client: QuartzQueryClient,
  emails: string[],
): Promise<void> {
  await client.query(
    `DELETE FROM quartz_app.organization_invites
     WHERE email = ANY($1::text[])
        OR organization_id IN (
          SELECT id FROM quartz_app.organizations
          WHERE created_by_user_id IN (
            SELECT id FROM quartz_app.users WHERE email = ANY($1::text[])
          )
        )
        OR invited_by_profile_id IN (
          SELECT id FROM quartz_app.organization_profiles
          WHERE user_id IN (
            SELECT id FROM quartz_app.users WHERE email = ANY($1::text[])
          )
        )
        OR accepted_by_profile_id IN (
          SELECT id FROM quartz_app.organization_profiles
          WHERE user_id IN (
            SELECT id FROM quartz_app.users WHERE email = ANY($1::text[])
          )
        )`,
    [emails],
  );
  await client.query(
    `DELETE FROM quartz_app.organization_profiles
     WHERE user_id IN (
       SELECT id FROM quartz_app.users WHERE email = ANY($1::text[])
     )
        OR organization_id IN (
          SELECT id FROM quartz_app.organizations
          WHERE created_by_user_id IN (
            SELECT id FROM quartz_app.users WHERE email = ANY($1::text[])
          )
        )`,
    [emails],
  );
  await client.query(
    `DELETE FROM quartz_app.sessions
     WHERE user_id IN (
       SELECT id FROM quartz_app.users WHERE email = ANY($1::text[])
     )`,
    [emails],
  );
  await client.query(
    `DELETE FROM quartz_app.oauth_identities
     WHERE user_id IN (
       SELECT id FROM quartz_app.users WHERE email = ANY($1::text[])
     )`,
    [emails],
  );
  await client.query(
    `DELETE FROM quartz_app.organizations
     WHERE created_by_user_id IN (
       SELECT id FROM quartz_app.users WHERE email = ANY($1::text[])
     )`,
    [emails],
  );
  await client.query(
    `DELETE FROM quartz_app.users
     WHERE email = ANY($1::text[])`,
    [emails],
  );
}

async function assertNoQuartzForeignKeys(client: QuartzQueryClient): Promise<void> {
  const result = await client.query<{
    table_name: string;
    constraint_name: string;
  }>(
    `SELECT table_name, constraint_name
     FROM information_schema.table_constraints
     WHERE constraint_schema = 'quartz_app'
       AND constraint_type = 'FOREIGN KEY'
     ORDER BY table_name, constraint_name`,
  );
  assert.deepEqual(result.rows, []);
}

function inviteTokenFromDelivery(delivery: WebhookPayload): string {
  const match = delivery.text.match(/\/invite\/([A-Za-z0-9_-]+)/);
  assert(match?.[1], "delivery payload should include an invite link");
  return match[1];
}

function inviteTokenFromText(text: string): string {
  const match = text.match(/\/invite\/([A-Za-z0-9_-]+)/);
  assert(match?.[1], "Resend payload should include an invite link");
  return match[1];
}

const previousWebhookUrl = process.env.QUARTZ_INVITE_EMAIL_WEBHOOK_URL;
const previousWebhookBearer = process.env.QUARTZ_INVITE_EMAIL_WEBHOOK_BEARER;
const previousDevMode = process.env.QUARTZ_INVITE_LINK_DEV_MODE;
const previousPublicBaseUrl = process.env.QUARTZ_PUBLIC_BASE_URL;
const previousResendApiKey = process.env.QUARTZ_RESEND_API_KEY;
const previousResendFrom = process.env.QUARTZ_RESEND_FROM;
const previousFetch = globalThis.fetch;
const testRun = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const ownerEmail = `quartz-owner-${testRun}@example.com`;
const inviteeEmail = `quartz-invitee-${testRun}@example.com`;
const resendOwnerEmail = `quartz-resend-owner-${testRun}@example.com`;
const resendInviteeEmail = `quartz-resend-invitee-${testRun}@example.com`;

try {
  await withInviteWebhook(async ({ url, deliveries }) => {
    await withQuartzAuthDb(async (client) => {
      await assertNoQuartzForeignKeys(client);
      process.env.QUARTZ_INVITE_EMAIL_WEBHOOK_URL = url;
      delete process.env.QUARTZ_RESEND_API_KEY;
      delete process.env.QUARTZ_RESEND_FROM;
      delete process.env.QUARTZ_INVITE_LINK_DEV_MODE;
      process.env.QUARTZ_PUBLIC_BASE_URL = "http://localhost:3000";

      await cleanupTestRows(client, [ownerEmail, inviteeEmail]);
      try {
        const { token: ownerToken, session: ownerSession } =
          await createOrUpdateGoogleSession(client, {
            providerSubject: `owner-${testRun}`,
            email: ownerEmail,
            displayName: "Quartz Owner",
            avatarUrl: "",
          });
        assert.equal(ownerSession.organizations.length, 0);

        const ownerOrganization = await createOrganization(
          client,
          ownerSession,
          `Quartz Owner Org ${testRun}`,
        );
        assert.equal(ownerOrganization.role, "admin");
        assert.match(ownerOrganization.actorUri, /^actor:\/\/proj-quartz\/organization\//);

        const refreshedOwnerSession = await sessionFromToken(client, ownerToken);
        assert.equal(refreshedOwnerSession?.activeOrganization?.id, ownerOrganization.id);

        const delivery = await createOrganizationInvite({
          client,
          session: refreshedOwnerSession!,
          organizationId: ownerOrganization.id,
          email: inviteeEmail,
        });
        assert.equal(delivery.status, "sent");
        assert.equal(deliveries.length, 1);
        assert.equal(deliveries[0]?.to, inviteeEmail);
        assert.match(deliveries[0]?.subject ?? "", /Join .* on Quartz/);
        assert.match(deliveries[0]?.text ?? "", /\/invite\//);

        const inviteToken = inviteTokenFromDelivery(deliveries[0]!);
        const { token: inviteeToken, session: inviteeSession } =
          await createOrUpdateGoogleSession(client, {
            providerSubject: `invitee-${testRun}`,
            email: inviteeEmail,
            displayName: "Quartz Invitee",
            avatarUrl: "",
          });
        assert.equal(inviteeSession.organizations.length, 0);

        const acceptedOrganization = await acceptInvite(client, inviteeSession, inviteToken);
        assert.equal(acceptedOrganization.id, ownerOrganization.id);
        assert.equal(acceptedOrganization.role, "member");

        const inviteeAfterAccept = await sessionFromToken(client, inviteeToken);
        assert.equal(inviteeAfterAccept?.activeOrganization?.id, ownerOrganization.id);
        assert.equal(inviteeAfterAccept?.organizations.length, 1);

        const inviteeOrganization = await createOrganization(
          client,
          inviteeAfterAccept!,
          `Quartz Invitee Org ${testRun}`,
        );
        assert.equal(inviteeOrganization.role, "admin");

        const inviteeAfterCreate = await sessionFromToken(client, inviteeToken);
        assert.equal(inviteeAfterCreate?.organizations.length, 2);
        assert.equal(inviteeAfterCreate?.activeOrganization?.id, inviteeOrganization.id);

        await switchOrganization(client, inviteeAfterCreate!, ownerOrganization.id);
        const inviteeAfterSwitch = await sessionFromToken(client, inviteeToken);
        assert.equal(inviteeAfterSwitch?.activeOrganization?.id, ownerOrganization.id);

        await revokeSession(client, ownerToken);
        assert.equal(await sessionFromToken(client, ownerToken), null);
      } finally {
        await cleanupTestRows(client, [ownerEmail, inviteeEmail]);
      }
    });
  });

  const resendRequests: ResendRequest[] = [];
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    assert(init, "Resend request should include init options");
    const headers = init.headers as Record<string, string>;
    resendRequests.push({
      url: String(input),
      authorization: headers.Authorization,
      body: JSON.parse(String(init.body)) as ResendRequest["body"],
    });
    return new Response(JSON.stringify({ id: "resend-test-email" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
  process.env.QUARTZ_RESEND_API_KEY = "re_test_key";
  process.env.QUARTZ_RESEND_FROM = "Quartz <invite@example.com>";
  delete process.env.QUARTZ_INVITE_EMAIL_WEBHOOK_URL;
  delete process.env.QUARTZ_INVITE_EMAIL_WEBHOOK_BEARER;
  delete process.env.QUARTZ_INVITE_LINK_DEV_MODE;
  process.env.QUARTZ_PUBLIC_BASE_URL = "http://localhost:3000";

  await withQuartzAuthDb(async (client) => {
    await cleanupTestRows(client, [resendOwnerEmail, resendInviteeEmail]);
    try {
      const { session: ownerSession } = await createOrUpdateGoogleSession(client, {
        providerSubject: `resend-owner-${testRun}`,
        email: resendOwnerEmail,
        displayName: "Quartz Resend Owner",
        avatarUrl: "",
      });
      const organization = await createOrganization(
        client,
        ownerSession,
        `Quartz Resend Org ${testRun}`,
      );
      const ownerAfterCreate = await createOrUpdateGoogleSession(client, {
        providerSubject: `resend-owner-${testRun}`,
        email: resendOwnerEmail,
        displayName: "Quartz Resend Owner",
        avatarUrl: "",
      });
      const activeOwnerSession = ownerAfterCreate.session;
      assert.equal(activeOwnerSession.activeOrganization?.id, organization.id);

      const delivery = await createOrganizationInvite({
        client,
        session: activeOwnerSession,
        organizationId: organization.id,
        email: resendInviteeEmail,
      });
      assert.equal(delivery.status, "sent");
      assert.equal(resendRequests.length, 1);
      const request = resendRequests[0]!;
      assert.equal(request.url, "https://api.resend.com/emails");
      assert.equal(request.authorization, "Bearer re_test_key");
      assert.equal(request.body.from, "Quartz <invite@example.com>");
      assert.deepEqual(request.body.to, [resendInviteeEmail]);
      assert.match(request.body.subject ?? "", /Join .* on Quartz/);
      assert.match(request.body.text ?? "", /\/invite\//);
      assert.match(request.body.html ?? "", /Accept the invite/);

      const inviteToken = inviteTokenFromText(request.body.text ?? "");
      const { session: inviteeSession } = await createOrUpdateGoogleSession(client, {
        providerSubject: `resend-invitee-${testRun}`,
        email: resendInviteeEmail,
        displayName: "Quartz Resend Invitee",
        avatarUrl: "",
      });
      const accepted = await acceptInvite(client, inviteeSession, inviteToken);
      assert.equal(accepted.id, organization.id);
      assert.equal(accepted.role, "member");
    } finally {
      await cleanupTestRows(client, [resendOwnerEmail, resendInviteeEmail]);
    }
  });
} finally {
  globalThis.fetch = previousFetch;
  if (previousWebhookUrl === undefined) {
    delete process.env.QUARTZ_INVITE_EMAIL_WEBHOOK_URL;
  } else {
    process.env.QUARTZ_INVITE_EMAIL_WEBHOOK_URL = previousWebhookUrl;
  }
  if (previousWebhookBearer === undefined) {
    delete process.env.QUARTZ_INVITE_EMAIL_WEBHOOK_BEARER;
  } else {
    process.env.QUARTZ_INVITE_EMAIL_WEBHOOK_BEARER = previousWebhookBearer;
  }
  if (previousDevMode === undefined) {
    delete process.env.QUARTZ_INVITE_LINK_DEV_MODE;
  } else {
    process.env.QUARTZ_INVITE_LINK_DEV_MODE = previousDevMode;
  }
  if (previousPublicBaseUrl === undefined) {
    delete process.env.QUARTZ_PUBLIC_BASE_URL;
  } else {
    process.env.QUARTZ_PUBLIC_BASE_URL = previousPublicBaseUrl;
  }
  if (previousResendApiKey === undefined) {
    delete process.env.QUARTZ_RESEND_API_KEY;
  } else {
    process.env.QUARTZ_RESEND_API_KEY = previousResendApiKey;
  }
  if (previousResendFrom === undefined) {
    delete process.env.QUARTZ_RESEND_FROM;
  } else {
    process.env.QUARTZ_RESEND_FROM = previousResendFrom;
  }
}

console.log(JSON.stringify({
  ok: true,
  ownerEmail,
  inviteeEmail,
  inviteWebhookDeliveries: 1,
  inviteResendDeliveries: 1,
}, null, 2));
