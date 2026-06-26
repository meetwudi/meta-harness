# Library

A Library is a governed place that agents may explore.

A Library may point to a repository folder, local folder outside the repo, cloud knowledge base, database, private notes, CMS, website, documentation portal, API, or another knowledge source.

Storage discovery says where the place is. The place itself carries the
knowledge.

Libraries organize knowledge, including Routines, Goals, Memory, Compliance,
Specs, and Tags.

## Discovery

Storage locations discover Libraries by querying their configured scope for
Library manifests.

Every filesystem Library root must contain `LIBRARY.toml`. The manifest names
the Library and describes that place's access governance.

A Library may contain Routines, Goals, Memory, Compliance, Specs, Tags,
references, and other Libraries; the place's own files define what is inside.

## Definition

`LIBRARY.toml` lives at the Library root.

Example:

```toml
name = "meta-harness"
description = "Shared Meta Harness knowledge, primitives, setup guidance, templates, and tools."
read_actors = ["actor://knowledge-agent"]
update_actors = []
```

Required fields:

- `name`
- `read_actors`
- `update_actors`

Other supported fields:

- `description`
- `agent_excludes`

`description` is a concise human-readable summary of what the Library is for.
Agents should use it when choosing among available Libraries.

Actor access entries are actor identity glob patterns expressed as `actor://`
URI patterns.

Use empty update lists when no actor may update the Library.

Examples:

```toml
update_actors = []
update_actors = ["actor://knowledge-agent"]
update_actors = ["actor://routine/proj-self/routines/*"]
update_actors = ["actor://routine/daily-gmail-learning-digest/routines/*"]
```

Read access is configurable per Library. For example:

```toml
read_actors = ["actor://knowledge-agent"]
```

Routine-scoped authority is represented by Routine actor identities, not Routine
governance fields. A Routine-backed agent may operate with both a base actor and
a Routine actor:

```text
actor://knowledge-agent
actor://routine/proj-self/routines/concise-cleanup
```

`agent_excludes` is an optional list of path patterns, relative to the Library
root, that agent runtimes should not expose when staging a Library into an agent
workspace. Use it for generated code, implementation internals, build output, or
other files that should not be part of agent discovery for that Library.

Example:

```toml
agent_excludes = [
  "knowledge-agent/**",
]
```

## References

Reference a Library by name:

```text
library://{library-name}
```

Library names use lowercase letters and digits separated by hyphens or
underscores.

Examples:

```text
library://meta-harness
library://proj-self
library://routine-memory
```

A Library reference selects a place to explore. Storage discovery does not
enumerate that place's contents.

Use Librarian tools to operate on `library://...` resource URIs. Sandbox
workspace paths address files staged inside the current sandbox workspace.

## Use Protocol

To use a Library:

1. Read storage discovery guidance.
2. Resolve the `library://{library-name}` reference through Librarian.
3. Read the selected place's `LIBRARY.toml` when it is a filesystem Library.
4. Follow the selected place's own `AGENTS.md`, governance, and files.
5. Read or update only the knowledge needed for the current work and only when
   active actor governance allows the update.

If a Library reference includes a suffix after the Library name, first resolve the Library name, then interpret the suffix inside that Library's own place and rules.

Library creation follows setup guidance in [LIBRARY-CREATION.md](../setup/LIBRARY-CREATION.md).

## Memory

Routine memory uses a local or external memory Library.

When no suitable Memory Library exists, create or organize one using
[MEMORY.md](MEMORY.md).

## Governance

Library governance belongs either in the Library entry or in the place it points to.

Compliance content still requires explicit human approval for obligation changes.

Agents must follow the selected Library's governance before updating knowledge.
