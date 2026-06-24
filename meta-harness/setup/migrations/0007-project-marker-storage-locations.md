# 0007: Project Marker Storage Locations

Migration marker: the source diff removes
`meta-harness/storage/knowledge-agent-local-storage-locations.toml`, and the
Knowledge Agent runtime reads `.meta-harness.json` `storage.locations`.

Change: storage location definitions move from copied Meta Harness TOML into
the managed project's `.meta-harness.json`. Storage location access is expressed
with actor URI grants over storage capabilities instead of standalone readable
and writable booleans.

## When To Apply

Apply this migration when:

- the old Meta Harness source ref includes
  `meta-harness/storage/knowledge-agent-local-storage-locations.toml`
- the new Meta Harness source ref expects `.meta-harness.json`
  `storage.locations`
- the managed repository uses the Knowledge Agent or Librarian storage
  discovery runtime

## Check

Inspect the managed repository for:

- `.meta-harness.json` `storage.locations`
- storage locations that should discover checked-in repository Libraries
- storage locations that should discover local Libraries under
  `project.localRoot`
- actor grants for `actor://knowledge-agent`
- discovery excludes for copied templates, dependency folders, build output, and
  sandbox workspaces
- references to
  `meta-harness/storage/knowledge-agent-local-storage-locations.toml` outside
  older migration notes

## References

Use these source files instead of duplicating instructions here:

- `meta-harness/storage/STORAGE.md`
- `meta-harness/HARNESS-DESIGN.md`
- `meta-harness/setup/BOOTSTRAP-NEW-REPOSITORY.md`
- `meta-harness/tools/check-project-harness-compliance`

Use the current versions of those files when the repository is upgrading to a
newer Meta Harness ref.

## Plan

1. Add `.meta-harness.json` `storage.locations` if it is missing.
2. Add a `repository` filesystem storage location rooted at `{{repoRootPath}}`
   with `actor://knowledge-agent` grants for `read`, `write`, `delete`,
   `query`, and `blob` when those capabilities are intended.
3. Use `filesystem-recursive` for repository discovery when the repository wants
   nested Library manifests discovered by configuration.
4. Add discovery excludes for `meta-harness/templates`,
   generated dependency/build folders, and any other project-specific folders
   that should not be scanned for `LIBRARY.toml`.
5. Add machine-local or temporary local storage locations only when the project
   needs those Library places.
6. Remove project references to
   `meta-harness/storage/knowledge-agent-local-storage-locations.toml`.
7. Run `meta-harness/tools/check-project-harness-compliance`.
