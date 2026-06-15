# Bootstrap New Repository

Use this guide to set up a new harnessed repository.

## Setup

Copy `meta-harness/` into the repository as-is.

Do not change copied files under `meta-harness/` for project-specific needs.

Optionally install bundled Codex skills into the repository:

```text
python3 meta-harness/tools/install-skills
```

Create project-specific harness content under `harness/`.

Copy `meta-harness/templates/LIBRARY.toml` to the repository root and
`meta-harness/templates/harness/LIBRARY.toml` to `harness/LIBRARY.toml`.

Create ignored local Library discovery at `harness/libraries/LIBRARIES.local.toml`
from the template. Choose a filesystem-safe project name from the repository
name, create `~/.<project-name>/task-memory`, and use that path for the
`task-memory` Library. Copy `meta-harness/templates/task-memory/LIBRARY.toml`
and `meta-harness/templates/task-memory/MEMORY.toml` into that memory directory
and adjust them if the project needs a different access policy or memory
structure. Local Libraries for the project default under `~/.<project-name>/`
unless otherwise specified. Because local task memory is ignored or external,
repository PR checks validate the template and any checked-in `LIBRARY.toml` or
`MEMORY.toml` files, not the live local memory directory.

Add `.meta-harness.json` to record the Meta Harness source.

Use [../HARNESS-DESIGN.md](../HARNESS-DESIGN.md) for the expected repository shape.

## Agent Prompt

Ask Codex or Claude Code:

> Adopt Meta Harness in this repository. Copy `meta-harness/` as-is, add
> `.meta-harness.json`, and create project-specific harness content under
> `harness/`. Choose a filesystem-safe project name from the repository name,
> create `~/.<project-name>/task-memory`, and register it in ignored
> `harness/libraries/LIBRARIES.local.toml`. Copy
> `meta-harness/templates/LIBRARY.toml` to the repository root,
> `meta-harness/templates/harness/LIBRARY.toml` to `harness/LIBRARY.toml`, and
> `meta-harness/templates/task-memory/LIBRARY.toml` plus
> `meta-harness/templates/task-memory/MEMORY.toml` into the task-memory
> directory. Use
> `meta-harness/setup/BOOTSTRAP-NEW-REPOSITORY.md` and
> `meta-harness/HARNESS-DESIGN.md` as the source docs.
