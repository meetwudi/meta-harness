import assert from "node:assert/strict";
import {
  authenticateApiKey,
  createApiKey,
  createOrganization,
  createOrUpdateGoogleSession,
  quartzUserActorUri,
  withQuartzAuthDb,
  type QuartzApiActorContext,
  type QuartzQueryClient,
} from "../../lib/quartz-auth-db";
import {
  ingestQuartzLibrary,
  listQuartzLibraries,
} from "../../lib/quartz-api-libraries";

// Harness-Requirement: proj-quartz.api.key-authentication
// Harness-Requirement: proj-quartz.api.key-actor-scope
// Harness-Requirement: proj-quartz.api.library-ingest
// Harness-Requirement: proj-quartz.api.production-library-listing
// Harness-Requirement: proj-quartz.api.project-storage

const testRun = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const ownerEmail = `quartz-api-owner-${testRun}@example.com`;
const memberEmail = `quartz-api-member-${testRun}@example.com`;
const libraryName = `api_test_${testRun.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}`;

async function cleanupTestRows(
  client: QuartzQueryClient,
  emails: string[],
  library: string,
): Promise<void> {
  await client.query(
    `DELETE FROM quartz_core.resources
     WHERE path = $1 OR path LIKE $2`,
    [`/libraries/${library}`, `/libraries/${library}/%`],
  ).catch(() => undefined);
  await client.query(
    `DELETE FROM quartz_app.api_keys
     WHERE user_id IN (
       SELECT id FROM quartz_app.users WHERE email = ANY($1::text[])
     )`,
    [emails],
  ).catch(() => undefined);
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

function librariesFromResult(result: Record<string, unknown>): Record<string, unknown>[] {
  return Array.isArray(result.libraries)
    ? result.libraries.filter((library): library is Record<string, unknown> =>
        Boolean(library) && typeof library === "object" && !Array.isArray(library)
      )
    : [];
}

let orgActorContext: QuartzApiActorContext | null = null;

try {
  await withQuartzAuthDb(async (client) => {
    await cleanupTestRows(client, [ownerEmail, memberEmail], libraryName);

    const { session: ownerSession } = await createOrUpdateGoogleSession(client, {
      providerSubject: `api-owner-${testRun}`,
      email: ownerEmail,
      displayName: "Quartz API Owner",
      avatarUrl: "",
    });
    const organization = await createOrganization(
      client,
      ownerSession,
      `Quartz API Org ${testRun}`,
    );
    const { apiKey: userApiKey, token: userToken } = await createApiKey({
      client,
      session: ownerSession,
      label: "User actor key",
    });
    assert.equal(userApiKey.actorScope, "user");
    assert.equal(userApiKey.actorUri, quartzUserActorUri(ownerSession.user.id));
    assert.match(userToken, /^qz_/);

    const userAuthentication = await authenticateApiKey(client, userToken);
    assert.equal(userAuthentication?.actorContext.actorUri, userApiKey.actorUri);

    const { apiKey: organizationApiKey, token: organizationToken } = await createApiKey({
      client,
      session: ownerSession,
      label: "Organization actor key",
      actorScope: "organization",
      organizationId: organization.id,
    });
    assert.equal(organizationApiKey.actorScope, "organization");
    assert.equal(organizationApiKey.actorUri, organization.actorUri);

    const { session: memberSession } = await createOrUpdateGoogleSession(client, {
      providerSubject: `api-member-${testRun}`,
      email: memberEmail,
      displayName: "Quartz API Member",
      avatarUrl: "",
    });
    await client.query(
      `INSERT INTO quartz_app.organization_profiles
       (organization_id, user_id, display_name, role)
       VALUES ($1, $2, $3, 'member')`,
      [organization.id, memberSession.user.id, memberSession.user.email],
    );
    await assert.rejects(
      () => createApiKey({
        client,
        session: memberSession,
        label: "Member organization key",
        actorScope: "organization",
        organizationId: organization.id,
      }),
      /organization admin profile/,
    );

    const organizationAuthentication = await authenticateApiKey(client, organizationToken);
    assert(organizationAuthentication);
    orgActorContext = organizationAuthentication.actorContext;
  });

  assert(orgActorContext);
  const ingest = await ingestQuartzLibrary(orgActorContext, {
    name: libraryName,
    description: "Quartz API integration test Library.",
    files: [
      {
        path: "MEMORY.toml",
        content: [
          "name = \"api-test-memory\"",
          "description = \"Quartz API integration test memory.\"",
          "",
        ].join("\n"),
      },
    ],
  });
  assert.equal((ingest.library as Record<string, unknown>).name, libraryName);
  assert.equal(ingest.filesWritten, 1);

  const listed = await listQuartzLibraries(orgActorContext);
  const library = librariesFromResult(listed).find((candidate) =>
    candidate.name === libraryName
  );
  assert(library);
  assert.equal(library.writable, true);
} finally {
  await withQuartzAuthDb(async (client) => {
    await cleanupTestRows(client, [ownerEmail, memberEmail], libraryName);
  });
}
