# 0004: Local Project Metadata

Migration marker: the project harness compliance check requires
`.meta-harness.json` `project.name` and `project.localRoot`.

Change: managed projects now record their filesystem-safe project name and local
root in `.meta-harness.json`. Local Libraries and Knowledge Agent runtime
artifacts use that local root by default.

## When To Apply

Apply this migration when:

- the managed repository has `.meta-harness.json`
- `.meta-harness.json` does not contain `project.name`
- `.meta-harness.json` does not contain `project.localRoot`

## Check

Inspect the managed repository for:

- `.meta-harness.json` `project.name`
- `.meta-harness.json` `project.localRoot`
- ignored `harness/libraries/LIBRARIES.local.toml` entries that should use the
  project local root
- local Memory Library folders such as `routine-memory`

## References

Use these source files instead of duplicating instructions here:

- `meta-harness/HARNESS-DESIGN.md`
- `meta-harness/setup/BOOTSTRAP-NEW-REPOSITORY.md`
- `meta-harness/templates/harness/libraries/LIBRARIES.local.toml`
- `meta-harness/tools/check-project-harness-compliance`

Use the current versions of those files when the repository is upgrading to a
newer Meta Harness ref.

## Plan

1. Choose a filesystem-safe project name from the repository name unless the
   human provides another name.
2. Set `.meta-harness.json` `project.name` to that value.
3. Set `.meta-harness.json` `project.localRoot` to `~/.<project-name>` unless
   the human provides another local root.
4. Update ignored local Library index entries to use the local root when they
   are project-local.
5. Create missing local Library folders only after human approval when they are
   outside the managed repository.
6. Run `meta-harness/tools/check-project-harness-compliance`.
