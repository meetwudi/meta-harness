# 0006: Routine Primitive Rename

Migration marker: the source diff introduces `meta-harness/primitives/ROUTINE.md`
and removes `meta-harness/primitives/TASK.md`.

Change: the reusable workflow primitive is renamed from Task to Routine. The
new primitive uses Routine, Routine execution, `ROUTINE.toml`,
`harness/routines`, Routine actor URIs, and Routine memory naming.

This migration is not complete by updating prose alone. Existing checked-in and
local Task-shaped data must be moved or aliased intentionally.

## When To Apply

Apply this migration when:

- the old Meta Harness source ref includes `meta-harness/primitives/TASK.md`
- the new Meta Harness source ref includes `meta-harness/primitives/ROUTINE.md`
- the managed repository contains Task-shaped definitions, tools, validators,
  actor URIs, memory Libraries, or local task memory data

## Check

Inspect the managed repository and configured local roots for:

- `harness/tasks`
- `TASK.toml`
- `task-memory`
- `library://task-memory`
- `actor://task/...`
- `knowledge-agent.task-handoffs`
- `librarian.task-actor-governance`
- `harness-run-task`
- `check-task-definitions`
- templates, skills, workflows, and local memory folders that still use Task
  naming

## References

Use these source files instead of duplicating instructions here:

- `meta-harness/primitives/ROUTINE.md`
- `meta-harness/primitives/GOAL.md`
- `meta-harness/primitives/LIBRARY.md`
- `meta-harness/primitives/MEMORY.md`
- `meta-harness/knowledge-agent/SPEC.toml`
- `meta-harness/librarian/SPEC.toml`

Use the current versions of those files when the repository is upgrading to a
newer Meta Harness ref.

## Plan

1. Rename checked-in Routine definitions from `harness/tasks` to
   `harness/routines`.
2. Rename each `TASK.toml` marker to `ROUTINE.toml`.
3. Update Routine-local `AGENTS.md` files to reference `ROUTINE.toml`.
4. Update Library descriptions and governance actor URIs from
   `actor://task/{library}/tasks/{name}` to
   `actor://routine/{library}/routines/{name}`.
5. Rename local memory concepts from `task-memory` to `routine-memory` when the
   memory Library is owned by Routine executions.
6. Migrate existing local task memory data into the selected Routine memory
   Library, preserving provenance and original meaning.
7. Rename Knowledge Agent discovery, handoff, prompt, and actor implementation
   from Task to Routine.
8. Rename Librarian actor-governance tests and implementation fixtures from
   Task actor URIs to Routine actor URIs.
9. Rename templates, installable skills, workflow checks, and validator tools
   from task naming to Routine naming.
10. Keep compatibility aliases only when a human explicitly approves them and
    records their deprecation plan.
11. Run the Routine definition validator after it exists.
12. Run `meta-harness/tools/check-library-definitions`.
13. Run `meta-harness/tools/check-project-harness-compliance`.

## Current Repository Note

This repository's checked-in Routine surfaces have been migrated to Routine
naming: `harness/routines`, `ROUTINE.toml`, `routine-memory`,
`actor://routine/...`, `knowledge-agent.routine-handoffs`,
`librarian.routine-actor-governance`, `harness-execute-routine`, and
`check-routine-definitions`.

Local or external memory roots may still contain old Task-shaped data from
previous source refs. Migrate those roots only when the owning human approves
writing outside the managed repository.
