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

## Database Relationships

Storage knowledge and generated database artifacts must not use
database-enforced foreign keys. Do not create `FOREIGN KEY` constraints or
column-level `REFERENCES` clauses in storage models, generated migrations, or
handwritten migrations.

Represent relationships as ordinary identifiers, canonical resource paths,
metadata, or application-owned references. Enforce cross-record behavior through
explicit application logic, storage routines, migration verification, repair
routines, and acceptance checks. Lifecycle behavior such as cleanup, orphan
repair, and cross-table validation belongs in governed migration or Routine
knowledge rather than database cascade rules.

## Storage Model Knowledge

Storage Specs may declare backend-neutral storage model and migration intent
collections. These records are human-authored natural-language knowledge that
describe persistence meaning, invariants, preservation expectations, and
verification criteria.

Generated implementation artifacts derive backend-specific schema definitions,
migration scripts, bootstrap plans, data migration scripts, and tests from that
Spec knowledge. Storage drivers execute the generated artifacts that match their
capabilities and deployment target.

The shared Harness resource model lives in:

```text
library://meta-harness/storage/storage-models/resources.toml
```

The shared storage configuration model lives in:

```text
library://meta-harness/storage/storage-models/storage-configurations.toml
```

The initial resource storage bootstrap migration intent lives in:

```text
library://meta-harness/storage/migration-intents/resource-storage-bootstrap.toml
```

Resource actor governance migration intent lives in:

```text
library://meta-harness/storage/migration-intents/resource-actor-governance.toml
```

## Project Storage Locations

The local Knowledge Agent runtime materializes storage locations from the
selected project marker. When no project marker is selected, it uses the
repository root marker:

```text
library://repository/.meta-harness.json
```

Project applications may pass their own marker path, such as:

```text
library://example-project/.meta-harness.json
```

The marker's `storage.locations` array is the selected project's starting point
for known storage locations. Each storage location definition includes:

- `name`
- `description`
- `driverName`
- `grants`
- `libraryRootPath`
- `discoveryMode`
- `discoveryExcludes`
- `discoverLibraries`
- `defaultForLibraryCreation`
- `createdLibraryReadActors`
- `createdLibraryUpdateActors`
- `enabledWhenEnv`
- `connectionStringEnv`
- `schemaName`
- `tableName`
- `autoEnsureSchema`
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

Project configs may use these path tokens in `libraryRootPath`:

- `{{repoRootPath}}`: repository root path.
- `{{projectRootPath}}`: directory containing the selected project marker.
- `{{localRoot}}`: resolved project local root.
- `{{tmpStorageLibrariesRoot}}`: project-scoped temporary local Library root.

The local runtime supports `driverName` values `filesystem` and `postgres`.
Filesystem locations use `filesystem-root-and-direct-children` or
`filesystem-recursive` discovery modes. Resource-backed locations, including
Postgres, use `resource-root-and-direct-children` or `resource-recursive`
discovery modes.

Filesystem storage remains the original local Knowledge Agent path. Postgres is
configured as a separate driver behind the same Library storage interface, so
runtime callers create, list, read, update, search, and tag Libraries through the
same Librarian tools.

`enabledWhenEnv` is an optional storage location gate. When present and the
named environment variable is not set, the local runtime skips that location.
Use this for deployment-backed locations that should be available when local
Docker, Kubernetes, or GCP provides the connection details, without making the
default filesystem-backed local agent depend on that deployment.

Postgres storage locations use the same Library resource interface as filesystem
locations. The database connection string is read from an environment variable
rather than stored in `.meta-harness.json`.

`defaultForLibraryCreation` is an optional boolean. When exactly one writable
materialized storage location sets it to `true`, Library creation tools may use
that location when the request omits `storageLocationName`. Agents should still
gather missing Library name and description, but they do not need to ask the
human to choose a storage location when the selected project knowledge already
designates one.

`createdLibraryReadActors` and `createdLibraryUpdateActors` are optional actor
URI arrays. When present, they define the `read_actors` and `update_actors`
written into new Library manifests created in that storage location. When
omitted, Library creation grants read and update authority to the active actor
that called the creation tool.

Postgres location fields:

- `connectionStringEnv`: environment variable containing the Postgres
  connection string. Defaults to `META_HARNESS_POSTGRES_URL`.
- `schemaName`: optional Postgres schema name for the storage table.
- `tableName`: optional storage table name. Defaults to
  `meta_harness_resources`.
- `autoEnsureSchema`: optional boolean. When omitted, the driver bootstraps its
  required schema with raw SQL.

Example Postgres-backed Library location:

```json
{
  "name": "project-postgres",
  "description": "Project Postgres-backed Libraries.",
  "driverName": "postgres",
  "enabledWhenEnv": "PROJECT_POSTGRES_URL",
  "connectionStringEnv": "PROJECT_POSTGRES_URL",
  "schemaName": "example_core",
  "tableName": "resources",
  "libraryRootPath": "/libraries",
  "discoveryMode": "resource-root-and-direct-children",
  "discoveryExcludes": [],
  "discoverLibraries": true,
  "defaultForLibraryCreation": true,
  "createdLibraryReadActors": ["actor://knowledge-agent"],
  "createdLibraryUpdateActors": ["actor://knowledge-agent"],
  "grants": [
    {
      "actors": ["actor://knowledge-agent"],
      "capabilities": ["read", "write", "delete", "query"]
    }
  ]
}
```

Local Docker, Kubernetes, and GCP deployments supply the connection string
through the named environment variable. Higher-level Library code does not need
to change when that deployment source changes.

Other drivers may be described by storage knowledge before a local driver
implementation exists; a runtime must fail clearly when asked to materialize an
unsupported driver.

## Agent Use

Use `librarian_read` to inspect
`library://repository/.meta-harness.json` or the selected project marker, such
as `library://example-project/.meta-harness.json`.
Read each location's name, description, driver, capabilities, Library discovery
fields, and Library placement fields from that knowledge.

Use writable storage locations to understand where new Libraries can be created.
When exactly one writable location is marked `defaultForLibraryCreation`, use it
as the default creation target without exposing the storage-location detail in
user-facing replies unless the human asks for internal details.

Use Library governance to understand whether a specific Library can be read or
updated by the current actor.

Use Librarian tools for `library://...` resources. Use sandbox workspace paths
for files staged inside the sandbox workspace.
