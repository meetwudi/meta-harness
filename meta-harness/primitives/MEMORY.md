# Memory

Memory is agent-usable knowledge carried across time.

A Library may contain Memory, point to it, or be primarily a Memory Library.

Filesystem Memory Libraries are also Library roots and must include
`LIBRARY.toml` for actor access.

`MEMORY.toml` marks a place as a structured Memory primitive and tells agents
how to use that memory collection.

The default local task Memory Library is:

```text
library://task-memory
```

Managed projects may expose it through storage discovery.

Unless otherwise specified, agents read `.meta-harness.json` `project.localRoot`
and use `<project.localRoot>/task-memory` as the local default location.

## Purpose

Memory helps agents:

- carry useful learning across task executions
- avoid repeating known mistakes
- preserve decisions, context, and execution history
- improve future work without inventing new source material

## Organization

Memory may be organized as:

- sequential entries
- summaries
- task-specific execution memory
- durable project context

The Memory Library and task choose the organization. Memory use follows the
Library's `LIBRARY.toml` access rules and the memory place's `MEMORY.toml`
instructions.

Agents choose Memory Libraries from Library descriptions, `LIBRARY.toml` access
rules, and `MEMORY.toml` instructions.

## Shape

`MEMORY.toml` describes the memory collection. It does not store the memory
entries.

Example:

```toml
instructions = [
  "Preserve provenance and meaning.",
  "Do not invent product content, compliance obligations, engineering practices, acceptance tests, or open questions.",
]
```

`MEMORY.toml` includes:

- `instructions`
- optional `[[collections]]`

Use `[[collections]]` when one Memory primitive contains named subcollections:

```toml
[[collections]]
name = "executions"
location = "{task-name}/executions/"
instructions = ["Store per-execution memory as sequential entries."]
```

Each collection includes:

- `name`
- `location`
- `instructions`

Repository checks validate `MEMORY.toml` files that are checked into or present
inside the repository being checked. Ignored local or external Memory Libraries
must follow their own `MEMORY.toml` at use time, but are not enforced by PR
checks unless that memory place is included in the checked path.

## Task Interaction

A task may:

- read relevant memory before acting
- create execution memory
- update durable task memory
- summarize older memory
- mark memory unavailable when no suitable Memory Library exists

Tasks may specify:

- `per_execution_memory_library`
- `cross_execution_memory_library`

Example:

```toml
per_execution_memory_library = "library://task-memory/{task-name}/executions/"
cross_execution_memory_library = "library://task-memory/{task-name}/common/"
```

## Governance

Memory updates must preserve provenance and meaning.

Memory must not invent product content, compliance obligations, engineering practices, acceptance tests, or open questions.

Compliance changes still require explicit human approval, even when proposed or remembered through Memory.
