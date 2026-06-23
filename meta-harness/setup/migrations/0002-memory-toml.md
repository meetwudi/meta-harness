# 0002: Memory Definition

Migration marker: the source diff introduces `MEMORY.toml` and
`check-memory-definitions`.

Change: Meta Harness introduced `MEMORY.toml` as the structured marker for
Memory primitives and added `check-memory-definitions`.

## When To Apply

Apply this migration when:

- the old Meta Harness source ref does not include `MEMORY.toml`
- the new Meta Harness source ref includes `MEMORY.toml`
- the managed repository has a Memory Library such as `library://routine-memory`

## Check

Inspect the managed repository for:

- Memory Library entries in `harness/libraries/LIBRARIES.toml`
- local Memory Library entries in `harness/libraries/LIBRARIES.local.toml`
- Memory Library locations that already contain `MEMORY.toml`
- installed git hooks or GitHub workflows that should run
  `check-memory-definitions`

Local or external Memory Libraries may be ignored by git. They still need a
`MEMORY.toml` at use time, but repository PR checks only validate checked-in or
otherwise present `MEMORY.toml` files under the checked repository path.

## References

Use these source files instead of duplicating instructions here:

- `meta-harness/primitives/MEMORY.md`
- `meta-harness/templates/routine-memory/MEMORY.toml`
- `meta-harness/tools/check-memory-definitions`
- `meta-harness/templates/git-hooks/commit-msg`
- `meta-harness/github/workflows/meta-harness-compliance.yml`

Use the current versions of those files when the repository is upgrading to a
newer Meta Harness ref.

## Plan

For each Memory Library:

1. Resolve its Library location from checked-in and local Library indexes.
2. If the memory place does not contain `MEMORY.toml`, propose copying
   `meta-harness/templates/routine-memory/MEMORY.toml` there or creating a
   project-specific `MEMORY.toml` with top-level `instructions` and any needed
   `[[collections]]`.
3. If the memory place already contains `MEMORY.toml`, verify it satisfies
   `check-memory-definitions`.
4. Update installed git hooks and GitHub workflows when the managed repository
   mirrors Meta Harness check templates.
5. Run Meta Harness checks, including `check-memory-definitions`.

Ask the human to approve updates to local or external Memory Libraries before
writing outside the managed repository.
