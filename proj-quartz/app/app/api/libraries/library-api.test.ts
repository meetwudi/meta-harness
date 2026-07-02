import assert from "node:assert/strict";
import {
  authenticateApiKey,
  createApiKey,
  createOrganization,
  createOrUpdateGoogleSession,
  listApiKeys,
  quartzOrganizationServiceAccountActorUri,
  quartzUserActorUri,
  sessionFromToken,
  switchOrganization,
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
const libraryNameUser = `api_user_${testRun.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}`;
const libraryNameOrganization = `api_org_${testRun.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}`;

async function cleanupTestRows(
  client: QuartzQueryClient,
  emails: string[],
  libraries: string[],
): Promise<void> {
  for (const library of libraries) {
    await client.query(
      `DELETE FROM quartz_core.resources
       WHERE path = $1 OR path LIKE $2`,
      [`/libraries/${library}`, `/libraries/${library}/%`],
    ).catch(() => undefined);
  }
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

let orgAUserActorContext: QuartzApiActorContext | null = null;
let orgAServiceActorContext: QuartzApiActorContext | null = null;
let orgBUserActorContext: QuartzApiActorContext | null = null;
let orgBServiceActorContext: QuartzApiActorContext | null = null;

try {
  await withQuartzAuthDb(async (client) => {
    await cleanupTestRows(
      client,
      [ownerEmail, memberEmail],
      [libraryNameUser, libraryNameOrganization],
    );

    const { token: ownerToken, session: ownerSession } = await createOrUpdateGoogleSession(client, {
      providerSubject: `api-owner-${testRun}`,
      email: ownerEmail,
      displayName: "Quartz API Owner",
      avatarUrl: "",
    });
    const organizationA = await createOrganization(
      client,
      ownerSession,
      `Quartz API Org A ${testRun}`,
    );
    const ownerSessionA = await sessionFromToken(client, ownerToken);
    assert.equal(ownerSessionA?.activeOrganization?.id, organizationA.id);

    const { apiKey: userApiKey, token: userToken } = await createApiKey({
      client,
      session: ownerSessionA!,
      label: "User actor key",
    });
    assert.equal(userApiKey.actorScope, "user");
    assert.equal(userApiKey.organizationId, organizationA.id);
    assert.equal(userApiKey.actorUri, quartzUserActorUri(ownerSession.user.id));
    assert.match(userToken, /^qz_/);

    const userAuthentication = await authenticateApiKey(client, userToken);
    assert.equal(userAuthentication?.actorContext.actorUri, userApiKey.actorUri);
    assert.equal(userAuthentication?.actorContext.organizationId, organizationA.id);
    assert.deepEqual(userAuthentication?.actorContext.contextFilterActorUris, [
      organizationA.actorUri,
    ]);
    orgAUserActorContext = userAuthentication!.actorContext;

    const { apiKey: organizationApiKey, token: organizationToken } = await createApiKey({
      client,
      session: ownerSessionA!,
      label: "Organization actor key",
      actorScope: "organization",
      organizationId: organizationA.id,
    });
    assert.equal(organizationApiKey.actorScope, "organization");
    assert.equal(organizationApiKey.organizationId, organizationA.id);
    assert.equal(
      organizationApiKey.actorUri,
      quartzOrganizationServiceAccountActorUri(organizationA.id, organizationApiKey.id),
    );

    const organizationAuthentication = await authenticateApiKey(client, organizationToken);
    assert(organizationAuthentication);
    assert.equal(organizationAuthentication.actorContext.organizationId, organizationA.id);
    assert.deepEqual(organizationAuthentication.actorContext.contextFilterActorUris, [
      organizationA.actorUri,
    ]);
    orgAServiceActorContext = organizationAuthentication.actorContext;

    const { token: memberToken, session: memberSession } = await createOrUpdateGoogleSession(client, {
      providerSubject: `api-member-${testRun}`,
      email: memberEmail,
      displayName: "Quartz API Member",
      avatarUrl: "",
    });
    await client.query(
      `INSERT INTO quartz_app.organization_profiles
       (organization_id, user_id, display_name, role)
       VALUES ($1, $2, $3, 'member')`,
      [organizationA.id, memberSession.user.id, memberSession.user.email],
    );
    await switchOrganization(client, memberSession, organizationA.id);
    const memberSessionA = await sessionFromToken(client, memberToken);
    await assert.rejects(
      () => createApiKey({
        client,
        session: memberSessionA!,
        label: "Member organization key",
        actorScope: "organization",
        organizationId: organizationA.id,
      }),
      /organization admin profile/,
    );

    const organizationB = await createOrganization(
      client,
      ownerSessionA!,
      `Quartz API Org B ${testRun}`,
    );
    const ownerSessionB = await sessionFromToken(client, ownerToken);
    assert.equal(ownerSessionB?.activeOrganization?.id, organizationB.id);
    assert.deepEqual(
      (await listApiKeys(client, ownerSessionB!)).map((apiKey) => apiKey.organizationId),
      [],
    );

    const { token: userTokenB } = await createApiKey({
      client,
      session: ownerSessionB!,
      label: "User actor key B",
    });
    const { apiKey: organizationApiKeyB, token: organizationTokenB } = await createApiKey({
      client,
      session: ownerSessionB!,
      label: "Organization actor key B",
      actorScope: "organization",
      organizationId: organizationB.id,
    });
    assert.equal(
      organizationApiKeyB.actorUri,
      quartzOrganizationServiceAccountActorUri(organizationB.id, organizationApiKeyB.id),
    );
    orgBUserActorContext = (await authenticateApiKey(client, userTokenB))!.actorContext;
    orgBServiceActorContext = (await authenticateApiKey(client, organizationTokenB))!.actorContext;

    await switchOrganization(client, ownerSessionB!, organizationA.id);
    const ownerSessionAAgain = await sessionFromToken(client, ownerToken);
    assert.equal(ownerSessionAAgain?.activeOrganization?.id, organizationA.id);
    assert.deepEqual(
      (await listApiKeys(client, ownerSessionAAgain!)).map((apiKey) => apiKey.organizationId),
      [organizationA.id, organizationA.id],
    );
  });

  assert(orgAUserActorContext);
  assert(orgAServiceActorContext);
  assert(orgBUserActorContext);
  assert(orgBServiceActorContext);
  const userIngest = await ingestQuartzLibrary(orgAUserActorContext, {
    name: libraryNameUser,
    description: "Quartz API integration test user-key Library.",
    files: [
      {
        path: "MEMORY.toml",
        content: "name = \"api-test-user-memory\"\n",
      },
    ],
  });
  assert.equal((userIngest.library as Record<string, unknown>).name, libraryNameUser);
  assert.equal(userIngest.filesWritten, 1);

  const organizationIngest = await ingestQuartzLibrary(orgBServiceActorContext, {
    name: libraryNameOrganization,
    description: "Quartz API integration test organization-key Library.",
    files: [
      {
        path: "MEMORY.toml",
        content: "name = \"api-test-organization-memory\"\n",
      },
    ],
  });
  assert.equal(
    (organizationIngest.library as Record<string, unknown>).name,
    libraryNameOrganization,
  );
  assert.equal(organizationIngest.filesWritten, 1);

  for (const context of [orgAUserActorContext, orgAServiceActorContext]) {
    const libraries = librariesFromResult(await listQuartzLibraries(context));
    const library = libraries.find((candidate) => candidate.name === libraryNameUser);
    assert(library);
    assert.equal(library.writable, true);
    assert.equal(
      libraries.some((candidate) => candidate.name === libraryNameOrganization),
      false,
    );
  }
  for (const context of [orgBUserActorContext, orgBServiceActorContext]) {
    const libraries = librariesFromResult(await listQuartzLibraries(context));
    const library = libraries.find((candidate) => candidate.name === libraryNameOrganization);
    assert(library);
    assert.equal(library.writable, true);
    assert.equal(
      libraries.some((candidate) => candidate.name === libraryNameUser),
      false,
    );
  }
} finally {
  await withQuartzAuthDb(async (client) => {
    await cleanupTestRows(
      client,
      [ownerEmail, memberEmail],
      [libraryNameUser, libraryNameOrganization],
    );
  });
}
