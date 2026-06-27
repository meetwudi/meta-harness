# Memory

Memory is agent-usable knowledge carried across time.

A Library may contain Memory, point to it, or be primarily a Memory Library.

Filesystem Memory Libraries are also Library roots and must include
`LIBRARY.toml` for actor access.

`MEMORY.toml` marks a place as a structured Memory primitive. It is the spec
for how that memory is laid out and how agents use and update that memory
collection.

The default local Routine Memory Library is:

```text
library://routine-memory
```

Managed projects may expose it through storage discovery.

Unless otherwise specified, agents read `.meta-harness.json` `project.localRoot`
and use `<project.localRoot>/routine-memory` as the local default location.

## Purpose

Memory helps agents:

- carry useful learning across Routine executions
- avoid repeating known mistakes
- preserve decisions, context, and execution history
- improve future work without inventing new source material

## Organization

Memory may be organized as:

- sequential entries
- summaries
- Routine-specific execution memory
- durable project context

The Memory Library and Routine choose the organization by writing it into
`MEMORY.toml`. Memory use follows the Library's `LIBRARY.toml` access rules and
the memory place's `MEMORY.toml` layout and instructions.

Agents choose Memory Libraries from Library descriptions, `LIBRARY.toml` access
rules, and `MEMORY.toml` instructions.

## Shape

`MEMORY.toml` describes the memory collection. It is a structural spec for the
memory entries, folders, collections, sequence rules, provenance expectations,
and update behavior. It does not store the memory entries themselves.

Example:

```toml
instructions = [
  "Preserve provenance and meaning.",
  "Do not invent product content, compliance obligations, engineering practices, acceptance tests, or open questions.",
]
```

`MEMORY.toml` includes:

- `instructions`
- optional `[curation]`
- optional `[[collections]]`

`[curation]` configures automatic memory curation for this Memory collection.
When omitted, `curation.auto_curated` defaults to `true`. Set it to `false`
when a Memory collection should be read by agents but skipped by automatic
curator agents.

Example:

```toml
[curation]
auto_curated = true
```

Use `[[collections]]` when one Memory primitive contains named subcollections:

```toml
[[collections]]
name = "executions"
location = "{routine-name}/executions/"
instructions = ["Store per-execution memory as sequential entries."]
```

Each collection includes:

- `name`
- `location`
- `instructions`

`location` defines where entries for that collection live. It may name a folder
pattern such as `{stock-symbol}/` or `{customer-name}/`, or a more specific
entry pattern such as `{routine-name}/executions/`. Collection instructions
define the entry format, sequencing rule, and provenance fields agents must
preserve.

For sequential memory, specify the sequence in `MEMORY.toml`. For example,
instructions can require one entry per event, one file per day, append-only
daily sections, learned-at timestamps, learned-from source fields, and the exact
user-stated fact or observation. Agents should follow that layout instead of
inventing a different memory shape.

Repository checks validate `MEMORY.toml` files that are checked into or present
inside the repository being checked. Ignored local or external Memory Libraries
must follow their own `MEMORY.toml` at use time, but are not enforced by PR
checks unless that memory place is included in the checked path.

## Routine Interaction

A Routine may:

- read relevant memory before acting
- create execution memory
- update durable Routine memory
- summarize older memory
- mark memory unavailable when no suitable Memory Library exists

Routines may specify:

- `per_execution_memory_library`
- `cross_execution_memory_library`

Example:

```toml
per_execution_memory_library = "library://routine-memory/{routine-name}/executions/"
cross_execution_memory_library = "library://routine-memory/{routine-name}/common/"
```

## Governance

Memory updates must preserve provenance and meaning.

Memory must not invent product content, compliance obligations, engineering practices, acceptance tests, or open questions.

Automatic memory curation must inspect existing Memory before writing, avoid
duplicating facts already captured, and only capture user-stated information
from the current curation scope.

Compliance changes still require explicit human approval, even when proposed or remembered through Memory.
