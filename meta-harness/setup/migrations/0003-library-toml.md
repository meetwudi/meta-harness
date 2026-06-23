# 0003: Library Definition

Migration marker: the source diff introduces `LIBRARY.toml` and removes
`primitive_kind` from Library indexes.

Change: Meta Harness moved Library access governance into `LIBRARY.toml`.
`LIBRARIES.toml` and `LIBRARIES.local.toml` now only identify Library places.

## When To Apply

Apply this migration when:

- the old Meta Harness source ref expects `primitive_kind` in Library indexes
- the new Meta Harness source ref includes `LIBRARY.toml`
- the managed repository has checked-in or local Library entries

## Check

Inspect the managed repository for:

- `primitive_kind` fields in `harness/libraries/LIBRARIES.toml`
- `primitive_kind` fields in `harness/libraries/LIBRARIES.local.toml`, when present
- filesystem Library locations that do not contain `LIBRARY.toml`
- local Memory Library locations such as `library://routine-memory`

## References

Use these source files instead of duplicating instructions here:

- `meta-harness/primitives/LIBRARY.md`
- `meta-harness/templates/LIBRARY.toml`
- `meta-harness/templates/harness/LIBRARY.toml`
- `meta-harness/templates/routine-memory/LIBRARY.toml`
- `meta-harness/tools/check-library-definitions`

Use the current versions of those files when the repository is upgrading to a
newer Meta Harness ref.

## Plan

For each Library:

1. Remove `primitive_kind` from its Library index entry.
2. Resolve the Library location.
3. If the Library is the repository root, add `LIBRARY.toml` with no Routine update
   access unless the human approves another policy.
4. If the Library is a shared harness Library such as `library://meta-harness`
   or `library://project-harness`, add `LIBRARY.toml` with no Routine update
   access unless the human approves another policy.
5. If the Library is local Routine memory, add `LIBRARY.toml` with
   Routine-URI-pattern update access for the Routines that own that memory.
6. Run `meta-harness/tools/check-library-definitions`.

Ask the human to approve updates to local or external Libraries before writing
outside the managed repository.
