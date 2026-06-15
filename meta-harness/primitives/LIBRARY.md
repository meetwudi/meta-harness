# Library

A Library is a governed place that agents may explore.

A Library may point to a repository folder, local folder outside the repo, cloud knowledge base, database, private notes, CMS, website, documentation portal, API, or another knowledge source.

The Library index says where the place is. The place itself carries the knowledge.

Libraries organize knowledge, including tasks, memory, and compliance.

## Shape

Project-specific Library discovery belongs under `harness/libraries/`:

```text
harness/libraries/
  AGENTS.md
  LIBRARIES.toml
  LIBRARIES.local.toml  # ignored when present
```

`AGENTS.md` explains Library discovery. `LIBRARIES.toml` is the checked-in index. `LIBRARIES.local.toml` is ignored and may add private or machine-local Libraries without weakening checked-in governance.

Libraries must be indexed only in `LIBRARIES.toml` or `LIBRARIES.local.toml`, not in `AGENTS.md` or other docs.

## Index

Each Library entry points to one place:

```toml
[[libraries]]
name = "meta-harness"
primitive_kind = "library"
location = "meta-harness"
relative_to = "current-git-repository"
```

Required fields:

- `name`
- `primitive_kind`
- `location`

`relative_to = "current-git-repository"` means the location is relative to the nearest Git repository root.

When `relative_to` is omitted, `location` is an absolute location or an external location understood by the agent or tool that uses it.

## References

Reference a Library by name:

```text
library://{library-name}
```

Examples:

```text
library://meta-harness
library://project-harness
library://task-memory
```

A Library reference selects a place to explore. The index does not enumerate that place's contents.

## Use Protocol

To use a Library:

1. Read Library discovery instructions.
2. Read the checked-in Library index.
3. Read the local Library index when present.
4. Resolve the `library://{library-name}` reference to its indexed place.
5. Follow the selected place's own `AGENTS.md`, governance, and files.
6. Read or update only the knowledge needed for the current work.

If a Library reference includes a suffix after the Library name, first resolve the Library name, then interpret the suffix inside that Library's own place and rules.

## Primitive Kind

`primitive_kind` tells agents what kind of harness primitive the Library primarily carries.

Initial kinds:

- `library`
- `compliance`
- `task`
- `memory`
- `reference`

A broad place such as `library://meta-harness` may contain several primitive kinds. Use `primitive_kind = "library"` and let the place's own files guide exploration.

## Memory

Task memory uses a local or external memory Library.

A task may create or organize a memory Library when no suitable local Library exists.
Unless otherwise specified, choose a filesystem-safe project name from the
repository name, use `~/.<project-name>/task-memory`, and register it in
`harness/libraries/LIBRARIES.local.toml`.

When a Memory Library contains `MEMORY.toml`, read it before using that Memory
Library.

## Governance

Library governance belongs either in the Library entry or in the place it points to.

Compliance content still requires explicit human approval for obligation changes.

Agents must follow the selected Library's governance before updating knowledge.
