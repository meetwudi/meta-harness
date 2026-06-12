# Library

A Library is a governed knowledge place that agents may read from or update according to project rules.

A Library may be a local folder outside the repo, cloud knowledge base, database, private note system, CMS, website, documentation portal, API, or another knowledge source.

Memory is a structured, agent-updatable Library path.

## Shape

Project-specific Library docs belong under `harness/libraries/`:

```text
harness/libraries/
  AGENTS.md
  LIBRARIES.toml
  {library-name}/
    AGENTS.md
    LIBRARY.toml
```

`harness/libraries/AGENTS.md` explains Library discovery.

`harness/libraries/LIBRARIES.toml` is the checked-in Library index.

`harness/libraries/LIBRARIES.local.toml` is the ignored local Library index.

Agents should read both TOML indexes when present. Local index entries may extend or override access details for the current machine, but must not weaken checked-in governance.

Each index entry points to a Library definition:

```toml
[[libraries]]
name = "repo"
definition = "repo/LIBRARY.toml"
```

`LIBRARY.toml` is the Library definition. It should include:

- library name
- URI authority
- purpose
- governance
- `[[paths]]` entries

The repo keeps Library docs. The knowledge itself lives wherever the Library says it lives.

Every checked-in Library must be listed in `LIBRARIES.toml` and have `AGENTS.md` and `LIBRARY.toml`. Agents must read both before using the Library unless a more specific `AGENTS.md` in the Library's discovery chain applies.

Local-only Library entries should include enough information to find the Library docs or explain why the Library is unavailable.

## URI

All Library references use `library://`:

```text
library://{library-name}/{path}
```

The `{library-name}` selects the Library. The `{path}` selects knowledge inside that Library.

Examples:

```text
library://project/memory/tasks/concise-harness-cleanup
library://project/memory/task-executions/concise-harness-cleanup/{execution-id}
library://private/memory/user-preferences
library://nyt/articles/...
```

Memory-capable paths are Library paths with memory rules.

## Paths

Each `[[paths]]` entry defines one addressable Library path:

```toml
[[paths]]
uri = "library://repo/compliance/{path}"
kind = "compliance"
location = "meta-harness/compliance"
relative_to = "current-git-repository"
```

`location` is optional. When present, `relative_to = "current-git-repository"` means the location is relative to the nearest Git repository root.

## Access

Library access may be:

- read-only
- read-write
- append-only
- human-approved for updates
- unavailable until a required tool, credential, or access method exists

Agents must follow the selected Library's access rules before reading or updating knowledge.

## Governance

Governance should say:

- who or what may read from the Library
- who or what may update the Library
- which paths require explicit human approval
- whether agents may append, edit, consolidate, or only propose changes
- how provenance must be preserved

Compliance paths require explicit human approval for obligation changes.

When a human asks to create, update, configure, or use memory in a managed project, agents should use a memory-capable Library unless the human explicitly names another memory system.

Requirements, decisions, checklists, product specs, and engineering specs remain authoritative in their own docs.
