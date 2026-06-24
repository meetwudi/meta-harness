# Bootstrap New Repository

Use this guide to set up a new harnessed repository.

## Setup

Copy `meta-harness/` into the repository as-is.

Do not change copied files under `meta-harness/` for project-specific needs.

Optionally install the bundled Codex skill into the repository:

```text
python3 meta-harness/tools/install-skills
```

Create project-specific harness content under `harness/`.

Copy `meta-harness/templates/LIBRARY.toml` to the repository root and
`meta-harness/templates/harness/LIBRARY.toml` to `harness/LIBRARY.toml`.

Choose a filesystem-safe project name from the repository name. Add
`.meta-harness.json` with `project.name`, `project.localRoot`, and
`storage.locations`; the default local root is `~/.<project-name>`.

Start with a `repository` storage location using `driverName = "filesystem"`,
actor grants for `actor://knowledge-agent`, `libraryRootPath =
"{{repoRootPath}}"`, `discoveryMode = "filesystem-recursive"`, and discovery
excludes for copied templates and generated dependency/build folders.

Create `<project.localRoot>/routine-memory` for the `routine-memory` Library.
Copy `meta-harness/templates/routine-memory/LIBRARY.toml` and
`meta-harness/templates/routine-memory/MEMORY.toml` into that memory directory
and adjust them if the project needs a different access policy or memory
structure. Because local Routine memory is ignored or external,
repository PR checks validate the template and any checked-in `LIBRARY.toml` or
`MEMORY.toml` files, not the live local memory directory.

Add `.meta-harness.json` to record the project metadata, storage locations, and
Meta Harness source.

Use [../HARNESS-DESIGN.md](../HARNESS-DESIGN.md) for the expected repository shape.

## Agent Prompt

Ask Codex or Claude Code:

> Adopt Meta Harness in this repository. Copy `meta-harness/` as-is, add
> `.meta-harness.json`, and create project-specific harness content under
> `harness/`. Choose a filesystem-safe project name from the repository name,
> set `.meta-harness.json` `project.name`, `project.localRoot`, and
> `storage.locations`, create
> `<project.localRoot>/routine-memory`. Copy
> `meta-harness/templates/LIBRARY.toml` to the repository root,
> `meta-harness/templates/harness/LIBRARY.toml` to `harness/LIBRARY.toml`, and
> `meta-harness/templates/routine-memory/LIBRARY.toml` plus
> `meta-harness/templates/routine-memory/MEMORY.toml` into the routine-memory
> directory. Use
> `meta-harness/setup/BOOTSTRAP-NEW-REPOSITORY.md` and
> `meta-harness/HARNESS-DESIGN.md` as the source docs.
