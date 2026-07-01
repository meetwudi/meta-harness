# Quartz AI Deployment Runbook

Source: human request on 2026-07-01 to let AI deploy Quartz from Deployment primitive knowledge.

## Purpose

Deploy Quartz by following governed Deployment knowledge. A deployment run may be executed by AI or by a human, but the run is complete only when the selected environment, checklist, run record, and required resource snapshot evidence are recorded.

## Before Starting

1. Read `DEPLOYMENT.toml`.
2. Read the selected environment record in `environments/`.
3. Read `library://proj-quartz/harness/SPEC.toml` and the requirement IDs cited by the environment and checklist.
4. Read `checklists/quartz-deployment.toml`.
5. Read the cloud resource approval records for every cloud resource the run will create, change, scale, delete, or use.
6. If a cloud resource approval record, approval time, or provider pointer is missing, consult the human before deploying.
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

Production deployment is draft until the concrete Google Cloud application target, database target, secret source, base URL, and resource snapshot source are recorded.

1. Use `environments/production.toml` as the environment record.
2. Verify one-by-one human approval records for every Google Cloud resource the run will create, change, scale, delete, or use.
3. Capture or refresh the Google Cloud resource snapshot before deployment.
4. Verify the production checklist items that apply before build or release.
5. Execute only the human-approved Google Cloud deployment commands recorded in this Deployment primitive.
6. Capture provider command output, build output, URLs, revisions, approval records, and verification evidence in a run record.

## Completion

A deployment is finished only when:

1. Every checklist item is marked `pass`, `blocked`, or `na`.
2. The run record includes command evidence, deployed revision or local build identifier, environment name, actor, started and finished timestamps, and remaining blockers.
3. Production runs include one-by-one human approval records for cloud resources and changes.
4. Production runs include a current Google Cloud resource snapshot.
5. The run record includes checklist attestation.
