# Primitive Orientation

Read this before working in a Meta Harness repository.

Meta Harness is knowledge-first. AI is the runtime that reads, follows, and updates knowledge under human rules.

Libraries are where knowledge lives. A Library points to a place. The agent explores that place through its own files, tools, and instructions.

Some knowledge is a primitive:

- Library: a governed place to explore.
- Routine: reusable composable workflow knowledge.
- Goal: an outcome-oriented primitive with evidence, state, progress, blockers,
  clarifications, and independent audit.
- Memory: agent-usable knowledge carried across time.
- Compliance: human-approved obligations and explicit checks used to govern and verify work.
- Spec: a modular requirement map with implementation-facing integration tests.
- Acceptance: end-to-end acceptance testing scenarios with circumstances,
  trigger scope, procedure, and expected behavior.
- ToolSpec: a modular definition of one agent-usable tool, including actor
  invocation governance, schemas, implementation reference, and test cases.
- Deployment: an environment-scoped deployment map with runbooks, checklists,
  run records, resource snapshots, and approved resource changes.
- Secret: governed secret metadata, scope, use/reveal policy, encrypted value
  reference, and audit expectations.
- Tags: independent retrieval metadata for scoped knowledge.

The primitives compose:

- Routines read Libraries.
- Routines may update Libraries when allowed.
- When a filesystem Library contains `LIBRARY.toml`, that file describes which
  actor URI patterns may read or update it.
- Routines use Memory without needing every Routine to restate that Memory
  exists.
- When Memory contains `MEMORY.toml`, that file describes how the memory is
  organized and what agents may update.
- The default local Routine Memory Library is `library://routine-memory` when
  registered.
- Routines use Compliance to make procedure and outcomes verifiable.
- Goals may be created by conversations, Routines, or other governed agents.
- Goals are declared met by independent Goal Auditor agents.
- Specs connect sourced requirements, integration tests, and implementation
  citations.
- Acceptance suites define end-to-end scenarios to run when scoped knowledge or
  implementation changes.
- ToolSpecs define discoverable tools whose generated code is derived from
  knowledge and whose invocation is governed by actor URI patterns.
- Deployments define how a service is deployed and how environment resources,
  run evidence, and resource changes are governed.
- Secrets separate metadata access, use authority, reveal authority, rotation,
  and audit from the encrypted secret payload.
- Tags help agents query by tags without requiring every primitive schema to
  include tag fields.
- Libraries organize all primitives.
- Library creation follows `library://meta-harness/setup/LIBRARY-CREATION.md`.
- ToolSpec creation follows
  `library://meta-harness/setup/TOOLSPEC-CREATION.md`.
- Storage locations follow `library://meta-harness/storage/STORAGE.md`.
- `library://...` references are Library resource URIs handled through
  Librarian tools.

Primitive TOML files identify themselves with a short comment header:

```toml
# This is a Harness primitive.
# See also: library://meta-harness
```

For `COMPLIANCE.toml`, the `# Harness-Compliance:` review notice remains the
first content line; the primitive header follows that notice.

Requirement files are structured harness files, but they are not primitives.

When starting work, first discover the relevant Libraries, then identify
applicable Routines, Goals, Memory, Compliance, Specs, Acceptance suites,
ToolSpecs, Deployments, and Tags.
