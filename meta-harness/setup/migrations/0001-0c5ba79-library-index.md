# 0001: Library Index

Migration commit: `0c5ba79`

Change: Meta Harness introduced Library and Task primitives, including checked-in Library discovery under `harness/libraries/`.

## When To Apply

Apply this migration when:

- the old Meta Harness source ref is before `0c5ba79`
- the new Meta Harness source ref includes `0c5ba79`
- the managed repository does not already have `harness/libraries/AGENTS.md` and `harness/libraries/LIBRARIES.toml`

## Check

Inspect the managed repository for:

- `harness/libraries/AGENTS.md`
- `harness/libraries/LIBRARIES.toml`
- `harness/libraries/LIBRARIES.local.toml` in `.gitignore`
- `library://meta-harness` and `library://project-harness` entries

## References

Use these source files instead of duplicating instructions here:

- `git show 0c5ba79:meta-harness/primitives/LIBRARY.md`
- `git show 0c5ba79:meta-harness/templates/harness/libraries/AGENTS.md`
- `git show 0c5ba79:meta-harness/templates/harness/libraries/LIBRARIES.toml`
- `git show 0c5ba79:meta-harness/templates/gitignore`

Use the current versions of those files when the repository is upgrading to a newer Meta Harness ref.

## Plan

If the Library index is missing, propose adding project-specific Library discovery under `harness/libraries/`.

The proposal should explain why the repository needs Library discovery after the Meta Harness update.

Ask the human to approve the migration plan before applying changes.
