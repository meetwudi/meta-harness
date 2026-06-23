# Storage

Storage is the Harness knowledge model for places where Libraries live.

A storage location is a named place backed by a storage driver. The location
carries a purpose, capabilities, Library discovery information, and Library
placement information.

## Concepts

- Storage driver: the lower-level implementation that can read, write, list,
  delete, and query when the backend supports those operations.
- Storage location: the named configured place where Libraries live.
- Discovery mode: the rule a storage driver uses to find Library manifests in a
  storage location.
- Library root: the place where a Library's files or records live.

Storage capabilities describe what the location's driver can do. Library
governance still determines whether a particular actor or Routine may read or
update a particular Library.

## Knowledge Agent Local Locations

The local Knowledge Agent runtime materializes storage locations from:

```text
library://meta-harness/storage/knowledge-agent-local-storage-locations.toml
```

That structured file defines the local runtime's known storage locations:

- `repository`: checked-in repository Libraries discovered from repository
  Library manifests.
- `machine-local`: machine-local Libraries discovered under the configured
  local root.
- `tmp-local`: local Library creation target.

Each storage location definition includes:

- `name`
- `description`
- `driver_name`
- capability fields
- discovery mode and exclude fields
- Library placement fields
- `source_uri`
- `guidance_uri`

## Agent Use

Use `librarian_read` to inspect
`library://meta-harness/storage/knowledge-agent-local-storage-locations.toml`.
Read each location's name, description, driver, capabilities, Library discovery
fields, and Library placement fields from that knowledge.

Use writable storage locations to understand where new Libraries can be created.

Use Library governance to understand whether a specific Library can be read or
updated by the current actor.

Use Librarian tools for `library://...` resources. Use sandbox workspace paths
for files staged inside the sandbox workspace.
