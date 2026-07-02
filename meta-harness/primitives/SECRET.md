# Secret

A Secret is a governed knowledge primitive for sensitive values.

Secret metadata is knowledge. Secret plaintext is not ordinary knowledge: it
must not be stored in prompts, Memory, Librarian traces, audit logs, screenshots,
or general Library text. A Secret primitive records scope, policy, encrypted
value reference, rotation state, and audit expectations so agents can request,
use, reveal, rotate, and fail clearly under governed rules.

## Shape

Filesystem and resource-backed Libraries may use this shape:

```text
{secret-library-root}/
  LIBRARY.toml
  SECRET.toml
  SECRET-VALUE.json
  AUDIT.jsonl
```

The Secret may be the whole Library when fine-grained access is required. A
future collection Library may hold several Secret records only when each Secret
still has explicit actor policy and encrypted value handling.

## Definition

`SECRET.toml` marks a Secret primitive. It includes:

- `label`
- `scope`
- `organization_id`
- `metadata_read_actors`
- `use_actors`
- `reveal_actors`
- `update_actors`
- `grant_actors`
- `delete_actors`
- `value_resource`
- `created_at`
- `updated_at`

Supported `scope` values are project-defined. Quartz currently uses `personal`
for a user-private secret inside an organization tenant and `organization` for
an organization-scoped secret.

The encrypted value resource is an implementation detail. Agents should not read
or write it through ordinary Librarian file tools. Secret tools and Routines may
read or update it only after checking active actor authority against the Secret
policy.

## Use And Reveal

Use authority and reveal authority are separate.

Use authority lets an agent use a Secret for an approved operation without
showing the plaintext to the user or model-visible transcript. Reveal authority
lets an agent show the plaintext to the user when the user asks to see, copy, or
fetch the value.

Agents must not turn a missing Secret into an implicit fallback. If a Secret is
missing or the active actor lacks use or reveal authority, the agent must fail
clearly with a missing-secret or access-denied request and should explain what
scope or actor approval is needed.

## Scope

Secret creation must determine the scope before storing a value.

For tenant-aware projects, a Secret is at least scoped to the active tenant or
organization. A personal Secret belongs to a user actor inside that tenant. An
organization Secret belongs to the organization tenant and uses role-specific
actor policy for use, reveal, rotation, grant, and deletion.

If user language leaves scope ambiguous, agents should choose the project
default only when the project's Secret creation policy states one. Otherwise
they should ask a short clarifying question before storing the value.

## Audit

Secret tools should append audit events for create, rotate, use, reveal, grant,
and delete operations. Audit records may include actor URI, operation, Secret
label, scope, timestamp, and result. Audit records must not include plaintext
secret values or reversible value material.

## Governance

Secret behavior is source-governed. Secret storage, encryption key management,
use/reveal policy, and redaction behavior must be documented before
implementation.

If the encryption key, storage target, tenant scope, actor authority, or reveal
policy is missing or unclear, fail clearly and consult the human rather than
using a fallback.
