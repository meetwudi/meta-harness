# 0005: Storage Discovery

Migration marker: the source diff removes `harness/libraries/LIBRARIES.toml`
and `harness/libraries/LIBRARIES.local.toml`.

Change: Librarian discovers Libraries by querying configured storage locations
for `LIBRARY.toml` files. Storage location knowledge now provides driver,
query scope, and discovery mode.

## When To Apply

Apply this migration when:

- the old Meta Harness source ref uses `harness/libraries/LIBRARIES.toml`
- the new Meta Harness source ref includes storage location discovery knowledge
- the managed repository already has filesystem Library roots with
  `LIBRARY.toml`

## Check

Inspect the managed repository for:

- checked-in `harness/libraries/LIBRARIES.toml`
- ignored `harness/libraries/LIBRARIES.local.toml`
- references to Library index files outside migration docs
- Library roots that still need `LIBRARY.toml`
- storage locations that should discover those Library roots

## References

Use these source files instead of duplicating instructions here:

- `meta-harness/storage/STORAGE.md`
- `.meta-harness.json` storage location entries when the new source ref uses
  project-marker storage locations
- `meta-harness/primitives/LIBRARY.md`
- `meta-harness/tools/check-library-definitions`
- `meta-harness/tools/check-project-harness-compliance`

Use the current versions of those files when the repository is upgrading to a
newer Meta Harness ref.

## Plan

1. Remove checked-in `harness/libraries/AGENTS.md`.
2. Remove checked-in `harness/libraries/LIBRARIES.toml`.
3. Remove ignored `harness/libraries/LIBRARIES.local.toml` when present.
4. Remove `LIBRARIES.local.toml` from `.gitignore`.
5. Ensure every Library root that should be discoverable has `LIBRARY.toml`.
6. Ensure configured storage locations cover the intended Library roots.
7. Run `meta-harness/tools/check-library-definitions`.
8. Run `meta-harness/tools/check-project-harness-compliance`.
