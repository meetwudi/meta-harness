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

## Project Storage Locations

The local Knowledge Agent runtime materializes storage locations from the
repository marker:

```text
library://repository/.meta-harness.json
```

The marker's `storage.locations` array is the repository-owned starting point for
known storage locations. Each storage location definition includes:

- `name`
- `description`
- `driverName`
- `grants`
- `libraryRootPath`
- `discoveryMode`
- `discoveryExcludes`
- `discoverLibraries`
- `sourceUri`
- `guidanceUri`

`grants` map storage capabilities to actor URI patterns. A grant record includes
`actors` and `capabilities`. Supported capability names are `read`, `write`,
`delete`, `query`, and `blob`.

Example:

```json
{
  "actors": ["actor://knowledge-agent"],
  "capabilities": ["read", "write", "delete", "query", "blob"]
}
```

The local filesystem runtime supports `driverName` value `filesystem`. Other
drivers, such as blob-backed storage drivers, may be described by storage
knowledge before a local driver implementation exists; a runtime must fail
clearly when asked to materialize an unsupported driver.

## Agent Use

Use `librarian_read` to inspect
`library://repository/.meta-harness.json`.
Read each location's name, description, driver, capabilities, Library discovery
fields, and Library placement fields from that knowledge.

Use writable storage locations to understand where new Libraries can be created.

Use Library governance to understand whether a specific Library can be read or
updated by the current actor.

Use Librarian tools for `library://...` resources. Use sandbox workspace paths
for files staged inside the sandbox workspace.
