# Bootstrap New Repository

Use this guide to set up a repository that develops Meta Harness knowledge in
place.

## Setup

Include `meta-harness/` as a checked-in framework directory in the repository.

Add root `AGENTS.md`, `COMPLIANCE.toml`, `LIBRARY.toml`, and
`.meta-harness.json`.

Optionally install the bundled Codex skill into the repository:

```text
python3 meta-harness/tools/install-skills
```

Top-level project Libraries use the `proj-` prefix. Create
`proj-<project-name>/` for project knowledge that belongs to the repository.

Copy `meta-harness/templates/LIBRARY.toml` to the repository root. Create each
`proj-*` Library with its own `LIBRARY.toml`.

Choose a filesystem-safe project name from the repository name. Add
`.meta-harness.json` with `project.name`, `project.localRoot`, and
`storage.locations`; the default local root is `~/.<project-name>`.

Start with a `repository` storage location using `driverName = "filesystem"`,
actor grants for `actor://knowledge-agent`, `libraryRootPath =
"{{repoRootPath}}"`, `discoveryMode = "filesystem-recursive"`, and discovery
excludes for templates and generated dependency/build folders.

Create `<project.localRoot>/routine-memory` for the `routine-memory` Library.
Copy `meta-harness/templates/routine-memory/LIBRARY.toml` and
`meta-harness/templates/routine-memory/MEMORY.toml` into that memory directory
and adjust them if the project needs a different access policy or memory
structure. Because local Routine memory is ignored or external,
repository PR checks validate the template and any checked-in `LIBRARY.toml` or
`MEMORY.toml` files, not the live local memory directory.

Add `.meta-harness.json` to record the project metadata, storage locations, and
Meta Harness source when the repository tracks one.

Use [../HARNESS-DESIGN.md](../HARNESS-DESIGN.md) for the expected repository shape.

## Agent Prompt

Ask Codex or Claude Code:

> Adopt Meta Harness in this repository. Add `.meta-harness.json`, root
> `LIBRARY.toml`, root `COMPLIANCE.toml`, and any top-level `proj-*` Library
> needed for repository project knowledge. Choose a filesystem-safe project
> name from the repository name, set `.meta-harness.json` `project.name`,
> `project.localRoot`, and `storage.locations`, create
> `<project.localRoot>/routine-memory`, and copy
> `meta-harness/templates/routine-memory/LIBRARY.toml` plus
> `meta-harness/templates/routine-memory/MEMORY.toml` into the routine-memory
> directory. Use
> `meta-harness/setup/BOOTSTRAP-NEW-REPOSITORY.md` and
> `meta-harness/HARNESS-DESIGN.md` as the source docs.
