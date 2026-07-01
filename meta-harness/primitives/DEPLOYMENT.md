# Deployment

A Deployment is a governed map for deploying a service in one or more
environments.

Deployments live in Libraries. `DEPLOYMENT.toml` marks a folder as a Deployment
primitive and points agents to environment records, runbooks, checklists,
resource snapshots, resource changes, and run records.

A Deployment may refer to Specs. If generated implementation or scripts are
needed, they should derive from Deployment and Spec knowledge rather than from
unrecorded operator convention.

## Shape

Filesystem Libraries may use this shape:

```text
{deployment-root}/
  AGENTS.md
  COMPLIANCE.toml
  DEPLOYMENT.toml
  environments/
    {environment-id}.toml
  runbooks/
    {runbook-id}.md
  checklists/
    {checklist-id}.toml
  resource-snapshots/
    {snapshot-id}.toml
  resource-changes/
    {change-id}.toml
  runs/
    {run-id}.toml
```

## Definition

`DEPLOYMENT.toml` includes:

- `name`
- `version`
- `source`
- `service`
- `requirements`
- `referenced_specs`
- `[[environment_collections]]`
- `[[runbook_collections]]`
- `[[checklist_collections]]`
- `[[resource_snapshot_collections]]`
- `[[resource_change_collections]]`
- `[[run_record_collections]]`

Each collection includes:

- `name`
- `location`

`DEPLOYMENT.toml` may include a `[governance]` table for completion rules,
human-approval requirements, evidence requirements, and unknown-detail handling.

## Environments

Environment records describe deployment targets such as local, production, or
other human-approved environments. Environment records should capture provider,
configuration source, resource classes, known blockers, and environment
separation.

## Runbooks And Checklists

Runbooks describe deployment procedure. Checklists define what must be verified
before a deployment run is complete.

A Deployment run is not complete merely because commands ran. It is complete
only when the Deployment's checklist and governance rules are satisfied or
marked blocked with evidence.

## Resource Snapshots

Resource snapshots record the actual resources a service uses in an
environment. For provider-backed resources, snapshots should include provider
pointers sufficient for a later operator or agent to find and manage the
resource.

Provider pointers may include provider name, account or project, region or
location, resource name, provider URI, console URL, and operation pointers for
later change, scale, or deletion.

Do not record secret values in resource snapshots.

## Resource Changes

Resource changes record intended or completed changes to provider-managed
resources, including creation, configuration changes, scaling, migration,
continued use, and deletion.

When a Deployment affects cloud-managed resources, each resource change must
trace to explicit human approval before the change is executed or the resource
is treated as approved for use. The change record should include approval time,
approver, approval source, provider pointers, and any conditions attached to the
approval.

## Run Records

Run records capture a specific deployment attempt or completion. They should
include selected environment, actor, timestamps, revision, commands or provider
actions, relevant resource snapshots, relevant resource changes, artifacts,
checklist statuses, attestation, and blockers.

Run records may point to logs and artifacts stored elsewhere when the storage
policy is human-approved. Do not store raw provider output that contains secret
values.

## Governance

Deployment knowledge is source-governed. AI agents must not invent deployment
targets, provider accounts, resource identities, or approval evidence.

If a deployment target, resource change, approval, provider pointer, credential
path, or artifact-storage policy is missing or unclear, consult the human before
deploying or recording completion.
