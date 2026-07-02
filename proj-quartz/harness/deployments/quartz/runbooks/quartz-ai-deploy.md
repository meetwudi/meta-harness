# Quartz AI Deployment Runbook

Source: human request on 2026-07-01 to let AI deploy Quartz from Deployment primitive knowledge.

## Purpose

Deploy Quartz by following governed Deployment knowledge. A deployment run may be executed by AI or by a human, but the run is complete only when the selected environment, checklist, run record, and required resource snapshot evidence are recorded.

## Before Starting

1. Read `DEPLOYMENT.toml`.
2. Read the selected environment record in `environments/`.
3. Read `library://proj-quartz/harness/SPEC.toml` and the requirement IDs cited by the environment and checklist.
4. Read `checklists/quartz-deployment.toml`.
5. Read the resource change records for every cloud resource the run will create, change, scale, delete, or use.
6. If a resource change record, approval time, or provider pointer is missing, consult the human before deploying.
7. If the selected environment has blockers or unresolved provider details, consult the human before deploying.

## Local Deployment

1. Use `environments/local.toml` as the environment record.
2. Start the local Postgres service with `docker compose -f proj-quartz/compose.yaml up -d postgres`.
3. Confirm the local environment provides the values described by `proj-quartz/app/.env.example`.
4. Run `npm --prefix proj-quartz/app run typecheck`.
5. Run `npm --prefix proj-quartz/app run test:conversations`.
6. Run `npm --prefix proj-quartz/app run test:streaming`.
7. Run `npm --prefix proj-quartz/app run test:auth-org` when the deployment includes auth and organization behavior.
8. Run `npm --prefix proj-quartz/app run build`.
9. Start Quartz with `npm --prefix proj-quartz/app run dev` for local interactive deployment, or `npm --prefix proj-quartz/app run start` after a production-mode build when that is the local replay target.
10. Capture a run record under `runs/` using `runs/run-template.toml`.

## Production Deployment

1. Use `environments/production.toml` as the environment record.
2. Verify one-by-one human approval in resource change records for every Google Cloud resource the run will create, change, scale, delete, or use.
3. Capture or refresh the Google Cloud resource snapshot before deployment.
4. Verify the production checklist items that apply before build or release.
5. Use Google Cloud project `future-of-work-497100` and region `us-east1`.
6. Use Artifact Registry repository `quartz` and image prefix `us-east1-docker.pkg.dev/future-of-work-497100/quartz/quartz`.
7. Use Cloud SQL Postgres instance `quartz-postgres`, database `quartz`, and database user `quartz`.
8. Store production runtime secrets in Secret Manager secrets named by `environments/production.toml`; do not record secret values in deployment knowledge.
9. Build the production image from the repository root with:

   ```sh
   gcloud builds submit . \
     --project future-of-work-497100 \
     --config proj-quartz/harness/deployments/quartz/build/cloudbuild.yaml \
     --substitutions _IMAGE=us-east1-docker.pkg.dev/future-of-work-497100/quartz/quartz:{revision}
   ```

10. Deploy the approved image to Cloud Run service `quartz` in `us-east1`, setting `QUARTZ_REPO_ROOT=/workspace`, `QUARTZ_PROJECT_ROOT=/workspace/proj-quartz`, `QUARTZ_PROJECT_CONFIG=proj-quartz/.meta-harness.json`, `QUARTZ_PUBLIC_BASE_URL` to the final Cloud Run origin, and binding the approved Secret Manager secrets to their matching runtime environment variables.
11. Attach the approved Cloud SQL instance to the Cloud Run service.
12. Verify the Google OAuth client authorizes `{QUARTZ_PUBLIC_BASE_URL}/api/auth/google/callback` before running Google sign-in acceptance.
13. Capture provider command output, build output, URLs, revisions, resource change records, and verification evidence in a run record.

## Production Acceptance

1. Open the Cloud Run service URL.
2. Sign in with Google.
3. Create or open a chat.
4. Ask `list all libraries`.
5. Verify Quartz returns a real assistant answer and includes the expected system Libraries:
   `library://meta-harness` and `library://proj-quartz`.
6. Record the browser verification evidence in the run record.

## Production API Testing

For local operator or agent smoke tests against the deployed production API,
look for these shell environment variables:

- `QUARTZ_PRODUCTION_URL`: production Quartz origin.
- `QUARTZ_PRODUCTION_API_KEY`: Quartz production API key for testing.

The API key is a local secret. Use it only by reference from the shell
environment, and do not record its value in deployment knowledge, run records,
command output, screenshots, or chat.

## Completion

A deployment is finished only when:

1. Every checklist item is marked `pass`, `blocked`, or `na`.
2. The run record includes command evidence, deployed revision or local build identifier, environment name, actor, started and finished timestamps, and remaining blockers.
3. Production runs include one-by-one human approval in resource change records for cloud resources and changes.
4. Production runs include a current Google Cloud resource snapshot.
5. The run record includes checklist attestation.
