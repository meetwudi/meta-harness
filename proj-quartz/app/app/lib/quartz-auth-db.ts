// Harness-Requirement: proj-quartz.auth-storage
// Harness-Requirement: proj-quartz.google-sign-in
// Harness-Requirement: proj-quartz.organization-context-switcher
// Harness-Requirement: proj-quartz.organization-invite-flow
// Harness-Requirement: proj-quartz.organization-profiles
// Harness-Requirement: proj-quartz.organization-resource-actors
// Harness-Requirement: proj-quartz.api.key-authentication
// Harness-Requirement: proj-quartz.api.key-actor-scope
// Harness-Requirement: proj-quartz.api.key-settings-dialog
// Harness-Requirement: proj-quartz.api.project-storage
// Harness-Requirement: proj-quartz.storage.api-key-project-storage
// Harness-Requirement: proj-quartz.user-account-organizations

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

type QueryResult<Row extends Record<string, unknown>> = {
  rows: Row[];
  rowCount?: number | null;
};

export type QuartzQueryClient = {
  query<Row extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ): Promise<QueryResult<Row>>;
  end?(): Promise<void>;
};

type LibrarianPostgresModule = {
  createPostgresQueryClientFromConnectionString(input: {
    connectionString: string;
  }): QuartzQueryClient;
};

export type QuartzUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string;
};

export type QuartzOrganization = {
  id: string;
  name: string;
  actorUri: string;
  role: string;
};

export type QuartzAuthSession = {
  tokenHash: string;
  user: QuartzUser;
  organizations: QuartzOrganization[];
  activeOrganization: QuartzOrganization | null;
};

export type GoogleIdentityProfile = {
  providerSubject: string;
  email: string;
  displayName: string;
  avatarUrl: string;
};

export type InviteDeliveryResult = {
  status: "sent" | "link_created";
  inviteUrl?: string;
};

export type QuartzResourceActorContext = {
  actorUri: string;
  actorUris: string[];
  defaultReadActors: string[];
  defaultUpdateActors: string[];
  conversationLibraryRootPath: string;
};

export type QuartzApiKeyActorScope = "user" | "organization";

export type QuartzApiKey = {
  id: string;
  label: string;
  tokenPrefix: string;
  actorScope: QuartzApiKeyActorScope;
  actorUri: string;
  organizationId: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

export type QuartzApiActorContext = {
  actorUri: string;
  actorUris: string[];
  defaultReadActors: string[];
  defaultUpdateActors: string[];
};

export type QuartzApiKeyAuthentication = {
  apiKey: QuartzApiKey;
  actorContext: QuartzApiActorContext;
};

type Migration = {
  id: string;
  statements: readonly string[];
  previousChecksums?: readonly string[];
};

let quartzProjectEnvLoaded = false;
let schemaReady = false;

const schemaName = "quartz_app";
const migrationsTable = `${schemaName}.schema_migrations`;
const sessionDurationMs = 30 * 24 * 60 * 60 * 1000;

const migrations: readonly Migration[] = [
  {
    id: "202607010001_identity_organizations",
    statements: [
      "CREATE EXTENSION IF NOT EXISTS pgcrypto",
      `CREATE SCHEMA IF NOT EXISTS ${schemaName}`,
      `CREATE TABLE IF NOT EXISTS ${schemaName}.users (
         id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
         email text NOT NULL UNIQUE,
         display_name text NOT NULL DEFAULT '',
         avatar_url text NOT NULL DEFAULT '',
         created_at timestamptz NOT NULL DEFAULT now(),
         updated_at timestamptz NOT NULL DEFAULT now()
       )`,
      `CREATE TABLE IF NOT EXISTS ${schemaName}.oauth_identities (
         provider text NOT NULL,
         provider_subject text NOT NULL,
         user_id uuid NOT NULL,
         created_at timestamptz NOT NULL DEFAULT now(),
         updated_at timestamptz NOT NULL DEFAULT now(),
         PRIMARY KEY (provider, provider_subject)
       )`,
      `CREATE TABLE IF NOT EXISTS ${schemaName}.organizations (
         id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
         name text NOT NULL,
         actor_uri text NOT NULL UNIQUE,
         created_by_user_id uuid NOT NULL,
         created_at timestamptz NOT NULL DEFAULT now(),
         updated_at timestamptz NOT NULL DEFAULT now()
       )`,
      `CREATE TABLE IF NOT EXISTS ${schemaName}.organization_profiles (
         id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
         organization_id uuid NOT NULL,
         user_id uuid NOT NULL,
         display_name text NOT NULL DEFAULT '',
         role text NOT NULL,
         created_at timestamptz NOT NULL DEFAULT now(),
         updated_at timestamptz NOT NULL DEFAULT now(),
         UNIQUE (organization_id, user_id)
       )`,
      `CREATE TABLE IF NOT EXISTS ${schemaName}.sessions (
         token_hash text PRIMARY KEY,
         user_id uuid NOT NULL,
         active_organization_id uuid,
         expires_at timestamptz NOT NULL,
         revoked_at timestamptz,
         created_at timestamptz NOT NULL DEFAULT now(),
         updated_at timestamptz NOT NULL DEFAULT now()
       )`,
      `CREATE TABLE IF NOT EXISTS ${schemaName}.organization_invites (
         id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
         organization_id uuid NOT NULL,
         email text NOT NULL,
         token_hash text NOT NULL UNIQUE,
         invited_by_profile_id uuid NOT NULL,
         accepted_by_profile_id uuid,
         expires_at timestamptz NOT NULL,
         accepted_at timestamptz,
         created_at timestamptz NOT NULL DEFAULT now()
       )`,
      `CREATE INDEX IF NOT EXISTS organization_profiles_user_idx
       ON ${schemaName}.organization_profiles(user_id)`,
      `CREATE INDEX IF NOT EXISTS organization_invites_email_idx
       ON ${schemaName}.organization_invites(email)`,
    ],
    previousChecksums: [
      "0c39209588ef7016ba053df4706b254b3e0895feef78e411b396cccbf24315ad",
    ],
  },
  {
    id: "202607010002_drop_identity_foreign_keys",
    statements: [
      `ALTER TABLE IF EXISTS ${schemaName}.oauth_identities
       DROP CONSTRAINT IF EXISTS oauth_identities_user_id_fkey`,
      `ALTER TABLE IF EXISTS ${schemaName}.organizations
       DROP CONSTRAINT IF EXISTS organizations_created_by_user_id_fkey`,
      `ALTER TABLE IF EXISTS ${schemaName}.organization_profiles
       DROP CONSTRAINT IF EXISTS organization_profiles_organization_id_fkey`,
      `ALTER TABLE IF EXISTS ${schemaName}.organization_profiles
       DROP CONSTRAINT IF EXISTS organization_profiles_user_id_fkey`,
      `ALTER TABLE IF EXISTS ${schemaName}.sessions
       DROP CONSTRAINT IF EXISTS sessions_user_id_fkey`,
      `ALTER TABLE IF EXISTS ${schemaName}.sessions
       DROP CONSTRAINT IF EXISTS sessions_active_organization_id_fkey`,
      `ALTER TABLE IF EXISTS ${schemaName}.organization_invites
       DROP CONSTRAINT IF EXISTS organization_invites_organization_id_fkey`,
      `ALTER TABLE IF EXISTS ${schemaName}.organization_invites
       DROP CONSTRAINT IF EXISTS organization_invites_invited_by_profile_id_fkey`,
      `ALTER TABLE IF EXISTS ${schemaName}.organization_invites
       DROP CONSTRAINT IF EXISTS organization_invites_accepted_by_profile_id_fkey`,
    ],
  },
  {
    id: "202607010003_api_keys",
    statements: [
      `CREATE TABLE IF NOT EXISTS ${schemaName}.api_keys (
         id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
         user_id uuid NOT NULL,
         label text NOT NULL,
         token_hash text NOT NULL UNIQUE,
         token_prefix text NOT NULL,
         actor_scope text NOT NULL,
         actor_uri text NOT NULL,
         organization_id uuid,
         last_used_at timestamptz,
         revoked_at timestamptz,
         created_at timestamptz NOT NULL DEFAULT now(),
         updated_at timestamptz NOT NULL DEFAULT now()
       )`,
      `CREATE INDEX IF NOT EXISTS api_keys_user_idx
       ON ${schemaName}.api_keys(user_id)`,
      `CREATE INDEX IF NOT EXISTS api_keys_token_hash_idx
       ON ${schemaName}.api_keys(token_hash)`,
    ],
  },
];

export function repoRootPath(): string {
  if (process.env.QUARTZ_REPO_ROOT) {
    return path.resolve(process.env.QUARTZ_REPO_ROOT);
  }
  return path.resolve(process.cwd(), "../..");
}

export function quartzProjectRootPath(): string {
  return process.env.QUARTZ_PROJECT_ROOT
    ? path.resolve(process.env.QUARTZ_PROJECT_ROOT)
    : path.resolve(process.cwd(), "..");
}

export function loadQuartzProjectEnv(): void {
  if (quartzProjectEnvLoaded) {
    return;
  }
  loadEnvConfig(quartzProjectRootPath(), process.env.NODE_ENV !== "production", console, true);
  quartzProjectEnvLoaded = true;
}

export function quartzPublicBaseUrl(): string {
  loadQuartzProjectEnv();
  return (
    process.env.QUARTZ_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_QUARTZ_BASE_URL ||
    "http://127.0.0.1:3000"
  ).replace(/\/+$/, "");
}

export function quartzGoogleRedirectUri(): string {
  loadQuartzProjectEnv();
  return process.env.QUARTZ_GOOGLE_REDIRECT_URI ||
    `${quartzPublicBaseUrl()}/api/auth/google/callback`;
}

export async function withQuartzAuthDb<T>(
  fn: (client: QuartzQueryClient) => Promise<T>,
): Promise<T> {
  loadQuartzProjectEnv();
  const connectionString = process.env.QUARTZ_POSTGRES_URL;
  if (!connectionString) {
    throw new Error("QUARTZ_POSTGRES_URL is required for Quartz auth storage.");
  }
  const client = (await loadLibrarianPostgresModule())
    .createPostgresQueryClientFromConnectionString({ connectionString });
  try {
    await ensureQuartzAuthSchema(client);
    return await fn(client);
  } finally {
    await client.end?.();
  }
}

export async function createOrUpdateGoogleSession(
  client: QuartzQueryClient,
  profile: GoogleIdentityProfile,
): Promise<{ token: string; session: QuartzAuthSession }> {
  const email = normalizeEmail(profile.email);
  await client.query("BEGIN");
  try {
    const userResult = await client.query<{ id: string }>(
      `INSERT INTO ${schemaName}.users (email, display_name, avatar_url, updated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (email) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         avatar_url = EXCLUDED.avatar_url,
         updated_at = now()
       RETURNING id`,
      [email, profile.displayName, profile.avatarUrl],
    );
    const userId = requiredRow(userResult, "Google user").id;
    await client.query(
      `INSERT INTO ${schemaName}.oauth_identities
       (provider, provider_subject, user_id, updated_at)
       VALUES ('google', $1, $2, now())
       ON CONFLICT (provider, provider_subject) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         updated_at = now()`,
      [profile.providerSubject, userId],
    );
    const token = randomToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + sessionDurationMs).toISOString();
    const activeOrganizationId = await firstOrganizationIdForUser(client, userId);
    await client.query(
      `INSERT INTO ${schemaName}.sessions
       (token_hash, user_id, active_organization_id, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [tokenHash, userId, activeOrganizationId, expiresAt],
    );
    await client.query("COMMIT");
    const session = await sessionFromTokenHash(client, tokenHash);
    if (!session) {
      throw new Error("Created session could not be loaded.");
    }
    return { token, session };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

export async function sessionFromToken(
  client: QuartzQueryClient,
  token: string,
): Promise<QuartzAuthSession | null> {
  if (!token) {
    return null;
  }
  return sessionFromTokenHash(client, hashToken(token));
}

export async function revokeSession(
  client: QuartzQueryClient,
  token: string,
): Promise<void> {
  if (!token) {
    return;
  }
  await client.query(
    `UPDATE ${schemaName}.sessions
     SET revoked_at = now(), updated_at = now()
     WHERE token_hash = $1`,
    [hashToken(token)],
  );
}

export async function createOrganization(
  client: QuartzQueryClient,
  session: QuartzAuthSession,
  name: string,
): Promise<QuartzOrganization> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Organization name is required.");
  }
  const id = randomUUID();
  const actorUri = `actor://proj-quartz/organization/${id}`;
  await client.query("BEGIN");
  try {
    const organization = requiredRow(
      await client.query<{
        id: string;
        name: string;
        actor_uri: string;
      }>(
        `INSERT INTO ${schemaName}.organizations
         (id, name, actor_uri, created_by_user_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, actor_uri`,
        [id, trimmedName, actorUri, session.user.id],
      ),
      "organization",
    );
    await client.query(
      `INSERT INTO ${schemaName}.organization_profiles
       (organization_id, user_id, display_name, role)
       VALUES ($1, $2, $3, 'admin')
       ON CONFLICT (organization_id, user_id) DO UPDATE SET
         role = 'admin',
         updated_at = now()`,
      [organization.id, session.user.id, session.user.displayName || session.user.email],
    );
    await client.query(
      `UPDATE ${schemaName}.sessions
       SET active_organization_id = $1, updated_at = now()
       WHERE token_hash = $2`,
      [organization.id, session.tokenHash],
    );
    await client.query("COMMIT");
    return {
      id: organization.id,
      name: organization.name,
      actorUri: organization.actor_uri,
      role: "admin",
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

export async function switchOrganization(
  client: QuartzQueryClient,
  session: QuartzAuthSession,
  organizationId: string,
): Promise<void> {
  const membership = await client.query(
    `SELECT 1
     FROM ${schemaName}.organization_profiles
     WHERE user_id = $1 AND organization_id = $2
     LIMIT 1`,
    [session.user.id, organizationId],
  );
  if (membership.rows.length === 0) {
    throw new Error("Organization is not available to this account.");
  }
  await client.query(
    `UPDATE ${schemaName}.sessions
     SET active_organization_id = $1, updated_at = now()
     WHERE token_hash = $2`,
    [organizationId, session.tokenHash],
  );
}

export async function createOrganizationInvite(input: {
  client: QuartzQueryClient;
  session: QuartzAuthSession;
  organizationId: string;
  email: string;
}): Promise<InviteDeliveryResult> {
  const email = normalizeEmail(input.email);
  const deliveryMode = inviteDeliveryMode();
  const adminProfile = await adminProfileForOrganization(
    input.client,
    input.session.user.id,
    input.organizationId,
  );
  const token = randomToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await input.client.query(
    `INSERT INTO ${schemaName}.organization_invites
     (organization_id, email, token_hash, invited_by_profile_id, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [input.organizationId, email, tokenHash, adminProfile.id, expiresAt],
  );
  const inviteUrl = `${quartzPublicBaseUrl()}/invite/${encodeURIComponent(token)}`;
  if (deliveryMode === "development_link") {
    console.log(`Quartz invite link for ${email}: ${inviteUrl}`);
    return {
      status: "link_created",
      inviteUrl,
    };
  }
  await deliverInviteEmail({
    to: email,
    inviteUrl,
    organizationName: adminProfile.organization_name,
  });
  return {
    status: "sent",
  };
}

export async function listApiKeys(
  client: QuartzQueryClient,
  session: QuartzAuthSession,
): Promise<QuartzApiKey[]> {
  const result = await client.query<ApiKeyRow>(
    `SELECT id, label, token_prefix, actor_scope, actor_uri, organization_id,
            created_at, last_used_at, revoked_at
     FROM ${schemaName}.api_keys
     WHERE user_id = $1
       AND revoked_at IS NULL
     ORDER BY created_at DESC`,
    [session.user.id],
  );
  return result.rows.map(apiKeyFromRow);
}

export async function createApiKey(input: {
  client: QuartzQueryClient;
  session: QuartzAuthSession;
  label: string;
  actorScope?: QuartzApiKeyActorScope;
  organizationId?: string;
}): Promise<{ apiKey: QuartzApiKey; token: string }> {
  const label = requiredApiKeyLabel(input.label);
  const actorScope = input.actorScope ?? "user";
  const actor = await apiKeyActorForScope({
    client: input.client,
    session: input.session,
    actorScope,
    organizationId: input.organizationId,
  });
  const token = `qz_${randomToken()}`;
  const tokenHash = hashToken(token);
  const tokenPrefix = token.slice(0, 10);
  const result = await input.client.query<ApiKeyRow>(
    `INSERT INTO ${schemaName}.api_keys
     (user_id, label, token_hash, token_prefix, actor_scope, actor_uri, organization_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, label, token_prefix, actor_scope, actor_uri, organization_id,
               created_at, last_used_at, revoked_at`,
    [
      input.session.user.id,
      label,
      tokenHash,
      tokenPrefix,
      actorScope,
      actor.actorUri,
      actor.organizationId,
    ],
  );
  return {
    apiKey: apiKeyFromRow(requiredRow(result, "API key")),
    token,
  };
}

export async function authenticateApiKey(
  client: QuartzQueryClient,
  token: string,
): Promise<QuartzApiKeyAuthentication | null> {
  const trimmed = token.trim();
  if (!trimmed) {
    return null;
  }
  const result = await client.query<ApiKeyRow>(
    `SELECT id, label, token_prefix, actor_scope, actor_uri, organization_id,
            created_at, last_used_at, revoked_at
     FROM ${schemaName}.api_keys
     WHERE token_hash = $1
       AND revoked_at IS NULL`,
    [hashToken(trimmed)],
  );
  const row = result.rows[0];
  if (!row) {
    return null;
  }
  await client.query(
    `UPDATE ${schemaName}.api_keys
     SET last_used_at = now(), updated_at = now()
     WHERE id = $1`,
    [row.id],
  );
  const apiKey = apiKeyFromRow(row);
  return {
    apiKey,
    actorContext: quartzApiActorContext(apiKey.actorUri),
  };
}

export async function loadInvite(
  client: QuartzQueryClient,
  token: string,
) {
  const tokenHash = hashToken(token);
  const result = await client.query<{
    id: string;
    email: string;
    organization_id: string;
    organization_name: string;
    accepted_at: string | null;
    expires_at: string;
  }>(
    `SELECT i.id, i.email, i.organization_id, o.name AS organization_name,
            i.accepted_at, i.expires_at
     FROM ${schemaName}.organization_invites i
     JOIN ${schemaName}.organizations o ON o.id = i.organization_id
     WHERE i.token_hash = $1`,
    [tokenHash],
  );
  return result.rows[0] ?? null;
}

export async function acceptInvite(
  client: QuartzQueryClient,
  session: QuartzAuthSession,
  token: string,
): Promise<QuartzOrganization> {
  const invite = await loadInvite(client, token);
  if (!invite) {
    throw new Error("Invite link was not found.");
  }
  if (invite.accepted_at) {
    throw new Error("Invite has already been accepted.");
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    throw new Error("Invite has expired.");
  }
  if (normalizeEmail(invite.email) !== normalizeEmail(session.user.email)) {
    throw new Error("Invite email does not match the signed-in account.");
  }
  await client.query("BEGIN");
  try {
    const profile = requiredRow(
      await client.query<{
        id: string;
      }>(
        `INSERT INTO ${schemaName}.organization_profiles
         (organization_id, user_id, display_name, role)
         VALUES ($1, $2, $3, 'member')
         ON CONFLICT (organization_id, user_id) DO UPDATE SET
           updated_at = now()
         RETURNING id`,
        [invite.organization_id, session.user.id, session.user.displayName || session.user.email],
      ),
      "accepted organization profile",
    );
    await client.query(
      `UPDATE ${schemaName}.organization_invites
       SET accepted_at = now(), accepted_by_profile_id = $1
       WHERE id = $2`,
      [profile.id, invite.id],
    );
    await client.query(
      `UPDATE ${schemaName}.sessions
       SET active_organization_id = $1, updated_at = now()
       WHERE token_hash = $2`,
      [invite.organization_id, session.tokenHash],
    );
    await client.query("COMMIT");
    return requiredOrganizationForUser(client, session.user.id, invite.organization_id);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function loadLibrarianPostgresModule(): Promise<LibrarianPostgresModule> {
  const moduleUrl = pathToFileURL(
    path.resolve(repoRootPath(), "meta-harness/librarian/impl/dist/index.js"),
  ).href;
  return import(/* webpackIgnore: true */ moduleUrl) as Promise<LibrarianPostgresModule>;
}

async function ensureQuartzAuthSchema(client: QuartzQueryClient): Promise<void> {
  if (schemaReady) {
    return;
  }
  await client.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
  await client.query(
    `CREATE TABLE IF NOT EXISTS ${migrationsTable} (
       id text PRIMARY KEY,
       artifact_checksum text NOT NULL,
       applied_at timestamptz NOT NULL DEFAULT now()
     )`,
  );
  const applied = await client.query<{ id: string; artifact_checksum: string }>(
    `SELECT id, artifact_checksum FROM ${migrationsTable}`,
  );
  const appliedChecksums = new Map(
    applied.rows.map((row) => [row.id, row.artifact_checksum]),
  );
  for (const migration of migrations) {
    const checksum = migrationChecksum(migration);
    const appliedChecksum = appliedChecksums.get(migration.id);
    if (appliedChecksum) {
      if (
        appliedChecksum !== checksum &&
        !migration.previousChecksums?.includes(appliedChecksum)
      ) {
        throw new Error(`Quartz auth migration checksum mismatch: ${migration.id}`);
      }
      continue;
    }
    await client.query("BEGIN");
    try {
      for (const statement of migration.statements) {
        await client.query(statement);
      }
      await client.query(
        `INSERT INTO ${migrationsTable} (id, artifact_checksum)
         VALUES ($1, $2)`,
        [migration.id, checksum],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
  schemaReady = true;
}

async function sessionFromTokenHash(
  client: QuartzQueryClient,
  tokenHash: string,
): Promise<QuartzAuthSession | null> {
  const sessionResult = await client.query<{
    token_hash: string;
    user_id: string;
    email: string;
    display_name: string;
    avatar_url: string;
    active_organization_id: string | null;
  }>(
    `SELECT s.token_hash, u.id AS user_id, u.email, u.display_name, u.avatar_url,
            s.active_organization_id
     FROM ${schemaName}.sessions s
     JOIN ${schemaName}.users u ON u.id = s.user_id
     WHERE s.token_hash = $1
       AND s.revoked_at IS NULL
       AND s.expires_at > now()`,
    [tokenHash],
  );
  const row = sessionResult.rows[0];
  if (!row) {
    return null;
  }
  const organizations = await organizationsForUser(client, row.user_id);
  let activeOrganization =
    organizations.find((organization) => organization.id === row.active_organization_id) ??
    organizations[0] ??
    null;
  if (activeOrganization && activeOrganization.id !== row.active_organization_id) {
    await client.query(
      `UPDATE ${schemaName}.sessions
       SET active_organization_id = $1, updated_at = now()
       WHERE token_hash = $2`,
      [activeOrganization.id, tokenHash],
    );
  }
  return {
    tokenHash,
    user: {
      id: row.user_id,
      email: row.email,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
    },
    organizations,
    activeOrganization,
  };
}

async function organizationsForUser(
  client: QuartzQueryClient,
  userId: string,
): Promise<QuartzOrganization[]> {
  const result = await client.query<{
    id: string;
    name: string;
    actor_uri: string;
    role: string;
  }>(
    `SELECT o.id, o.name, o.actor_uri, p.role
     FROM ${schemaName}.organization_profiles p
     JOIN ${schemaName}.organizations o ON o.id = p.organization_id
     WHERE p.user_id = $1
     ORDER BY p.created_at, o.name`,
    [userId],
  );
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    actorUri: row.actor_uri,
    role: row.role,
  }));
}

async function firstOrganizationIdForUser(
  client: QuartzQueryClient,
  userId: string,
): Promise<string | null> {
  return (await organizationsForUser(client, userId))[0]?.id ?? null;
}

async function requiredOrganizationForUser(
  client: QuartzQueryClient,
  userId: string,
  organizationId: string,
): Promise<QuartzOrganization> {
  const organization = (await organizationsForUser(client, userId))
    .find((candidate) => candidate.id === organizationId);
  if (!organization) {
    throw new Error("Organization is not available to this account.");
  }
  return organization;
}

async function adminProfileForOrganization(
  client: QuartzQueryClient,
  userId: string,
  organizationId: string,
): Promise<{ id: string; organization_name: string }> {
  return requiredRow(
    await client.query<{ id: string; organization_name: string }>(
      `SELECT p.id, o.name AS organization_name
       FROM ${schemaName}.organization_profiles p
       JOIN ${schemaName}.organizations o ON o.id = p.organization_id
       WHERE p.user_id = $1
         AND p.organization_id = $2
         AND p.role = 'admin'`,
      [userId, organizationId],
    ),
    "organization admin profile",
  );
}

async function deliverInviteEmail(input: {
  to: string;
  organizationName: string;
  inviteUrl: string;
}): Promise<void> {
  if (process.env.QUARTZ_RESEND_API_KEY?.trim()) {
    await deliverInviteEmailWithResend(input);
    return;
  }

  const webhookUrl = requiredInviteEmailWebhookUrl();
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.QUARTZ_INVITE_EMAIL_WEBHOOK_BEARER
        ? { Authorization: `Bearer ${process.env.QUARTZ_INVITE_EMAIL_WEBHOOK_BEARER}` }
        : {}),
    },
    body: JSON.stringify({
      to: input.to,
      subject: `Join ${input.organizationName} on Quartz`,
      text: `Open this invite link to join ${input.organizationName} on Quartz: ${input.inviteUrl}`,
    }),
  });
  if (!response.ok) {
    throw new Error(`Invite email webhook failed: ${response.status}`);
  }
}

async function deliverInviteEmailWithResend(input: {
  to: string;
  organizationName: string;
  inviteUrl: string;
}): Promise<void> {
  const from = requiredResendFrom();
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requiredResendApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: `Join ${input.organizationName} on Quartz`,
      text: `Open this invite link to join ${input.organizationName} on Quartz: ${input.inviteUrl}`,
      html: [
        `<p>You have been invited to join <strong>${escapeHtml(input.organizationName)}</strong> on Quartz.</p>`,
        `<p><a href="${escapeHtml(input.inviteUrl)}">Accept the invite</a></p>`,
        `<p>If the button does not work, open this link: ${escapeHtml(input.inviteUrl)}</p>`,
      ].join(""),
    }),
  });
  if (!response.ok) {
    throw new Error(`Resend invite email failed: ${response.status}`);
  }
}

function inviteDeliveryMode(): "resend" | "email" | "development_link" {
  if (process.env.QUARTZ_RESEND_API_KEY?.trim()) {
    return "resend";
  }
  if (process.env.QUARTZ_INVITE_EMAIL_WEBHOOK_URL?.trim()) {
    return "email";
  }
  if (process.env.QUARTZ_INVITE_LINK_DEV_MODE === "true") {
    return "development_link";
  }
  throw new Error(
    "Configure QUARTZ_INVITE_EMAIL_WEBHOOK_URL for invite email delivery, or set QUARTZ_INVITE_LINK_DEV_MODE=true for local link testing.",
  );
}

type ApiKeyRow = {
  id: string;
  label: string;
  token_prefix: string;
  actor_scope: string;
  actor_uri: string;
  organization_id: string | null;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

async function apiKeyActorForScope(input: {
  client: QuartzQueryClient;
  session: QuartzAuthSession;
  actorScope: QuartzApiKeyActorScope;
  organizationId?: string;
}): Promise<{ actorUri: string; organizationId: string | null }> {
  if (input.actorScope === "user") {
    return {
      actorUri: quartzUserActorUri(input.session.user.id),
      organizationId: null,
    };
  }
  if (input.actorScope !== "organization") {
    throw new Error("API key actor scope must be user or organization.");
  }
  const organizationId = input.organizationId?.trim();
  if (!organizationId) {
    throw new Error("Organization actor API keys require an organization.");
  }
  await adminProfileForOrganization(input.client, input.session.user.id, organizationId);
  const organization = await requiredOrganizationForUser(
    input.client,
    input.session.user.id,
    organizationId,
  );
  return {
    actorUri: organization.actorUri,
    organizationId,
  };
}

function apiKeyFromRow(row: ApiKeyRow): QuartzApiKey {
  const actorScope = apiKeyActorScopeFromStorage(row.actor_scope);
  return {
    id: row.id,
    label: row.label,
    tokenPrefix: row.token_prefix,
    actorScope,
    actorUri: row.actor_uri,
    organizationId: row.organization_id,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    revokedAt: row.revoked_at,
  };
}

function apiKeyActorScopeFromStorage(value: string): QuartzApiKeyActorScope {
  if (value === "user" || value === "organization") {
    return value;
  }
  throw new Error(`Unknown API key actor scope: ${value}`);
}

function requiredApiKeyLabel(value: string): string {
  const label = value.trim();
  if (!label) {
    throw new Error("API key label is required.");
  }
  if (label.length > 120) {
    throw new Error("API key label must be 120 characters or fewer.");
  }
  return label;
}

function requiredInviteEmailWebhookUrl(): string {
  const webhookUrl = process.env.QUARTZ_INVITE_EMAIL_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    throw new Error("QUARTZ_INVITE_EMAIL_WEBHOOK_URL is required for invite email delivery.");
  }
  return webhookUrl;
}

function requiredResendApiKey(): string {
  const apiKey = process.env.QUARTZ_RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("QUARTZ_RESEND_API_KEY is required for Resend invite email delivery.");
  }
  return apiKey;
}

function requiredResendFrom(): string {
  const from = process.env.QUARTZ_RESEND_FROM?.trim();
  if (!from) {
    throw new Error("QUARTZ_RESEND_FROM is required for Resend invite email delivery.");
  }
  return from;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function requiredRow<Row extends Record<string, unknown>>(
  result: QueryResult<Row>,
  label: string,
): Row {
  const row = result.rows[0];
  if (!row) {
    throw new Error(`${label} was not found.`);
  }
  return row;
}

function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function normalizeEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    throw new Error("A valid email address is required.");
  }
  return email;
}

function migrationChecksum(migration: Migration): string {
  return createHash("sha256")
    .update(JSON.stringify(migration))
    .digest("hex");
}

export function projectMetaHarnessConfig(): Record<string, unknown> {
  return JSON.parse(
    readFileSync(path.resolve(quartzProjectRootPath(), ".meta-harness.json"), "utf8"),
  ) as Record<string, unknown>;
}

export function quartzUserActorUri(userId: string): string {
  return `actor://proj-quartz/user/${safeActorSegment(userId)}`;
}

export function quartzResourceActorContext(
  session: QuartzAuthSession,
): QuartzResourceActorContext {
  const userActorUri = quartzUserActorUri(session.user.id);
  const activeOrganization = session.activeOrganization;
  const organizationActorUri = activeOrganization?.actorUri;
  const ownerActors = organizationActorUri ? [organizationActorUri] : [userActorUri];
  const projectActorUri = quartzProjectActorUri();
  return {
    actorUri: userActorUri,
    actorUris: uniqueActors([
      userActorUri,
      ...(organizationActorUri ? [organizationActorUri] : []),
      projectActorUri,
    ]),
    defaultReadActors: ownerActors,
    defaultUpdateActors: ownerActors,
    conversationLibraryRootPath: organizationActorUri
      ? `/libraries/organizations/${safeActorSegment(activeOrganization.id)}/knowledge-agent-conversations`
      : `/libraries/users/${safeActorSegment(session.user.id)}/knowledge-agent-conversations`,
  };
}

export function quartzResourceActorEnv(
  context: QuartzResourceActorContext,
): Record<string, string> {
  return {
    META_HARNESS_ACTIVE_ACTOR_URI: context.actorUri,
    META_HARNESS_ACTIVE_ACTOR_URIS: context.actorUris.join("\n"),
    META_HARNESS_DEFAULT_READ_ACTORS: context.defaultReadActors.join("\n"),
    META_HARNESS_DEFAULT_UPDATE_ACTORS: context.defaultUpdateActors.join("\n"),
    META_HARNESS_CONVERSATION_LIBRARY_ROOT_PATH: context.conversationLibraryRootPath,
  };
}

export function quartzApiActorContext(actorUri: string): QuartzApiActorContext {
  const projectActorUri = quartzProjectActorUri();
  return {
    actorUri,
    actorUris: uniqueActors([actorUri, projectActorUri]),
    defaultReadActors: [actorUri],
    defaultUpdateActors: [actorUri],
  };
}

function quartzProjectActorUri(): string {
  const config = projectMetaHarnessConfig();
  const project = config.project;
  const actorUri = project && typeof project === "object" && !Array.isArray(project)
    ? (project as Record<string, unknown>).actorUri
    : undefined;
  if (typeof actorUri !== "string" || !actorUri.startsWith("actor://")) {
    throw new Error("Quartz project actor URI must be configured.");
  }
  return actorUri;
}

function safeActorSegment(value: string): string {
  const segment = value.trim().replace(/[^A-Za-z0-9._-]/g, "_");
  if (!segment) {
    throw new Error("Actor segment must contain URL-safe characters.");
  }
  return segment;
}

function uniqueActors(actors: string[]): string[] {
  return actors.filter((actor, index, all) => all.indexOf(actor) === index);
}
