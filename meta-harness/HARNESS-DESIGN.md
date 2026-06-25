> Compliance: This file contains human-approved repository rules. AI agents may not change compliance obligations in this file unless a human explicitly approves the change.

# Harness Design

## Principles

Meta Harness defines how a repository uses knowledge-first harness docs.

A Meta Harness repository carries `.meta-harness.json` and follows this design.

Development principles are defined in [compliance/DEVELOPMENT-PRINCIPLES.md](compliance/DEVELOPMENT-PRINCIPLES.md).

Meta Harness is self-managed: this repository uses the same marker, Libraries,
and Routines that it defines.

`meta-harness/` is the framework layer: primitives, setup guidance, templates,
tools, and runtime implementation.

Top-level `proj-*` directories are project Libraries. This repository's
self-maintenance project lives under `proj-self-maintenance/`.

Harness docs use progressive disclosure through `AGENTS.md` files. A harness doc should be reachable from the root by following the `AGENTS.md` chain.

The root `AGENTS.md` is protected: AI agents may change it only when a human explicitly asks to change `AGENTS.md`.

## Repository Shape

```text
.meta-harness.json
.gitignore
AGENTS.md
COMPLIANCE.toml
LIBRARY.toml
meta-harness/
  AGENTS.md
  LIBRARY.toml
  HARNESS-DESIGN.md
  HARNESS-FILE-METADATA.md
  setup/
    AGENTS.md
    BOOTSTRAP-NEW-REPOSITORY.md
    PRIMITIVE-ORIENTATION.md
  compliance/
    AI-POLICY.md
    DEVELOPMENT-PRINCIPLES.md
    PRODUCT.md
    ENGINEERING.md
  primitives/
    AGENTS.md
  skills/
    AGENTS.md
    {skill-name}/
      SKILL.md
      agents/
        openai.yaml
  templates/
    LIBRARY.toml
    git-hooks/
    gitignore
    routine-memory/
      LIBRARY.toml
      MEMORY.toml
  tools/
  github/
    workflows/
proj-{project-name}/
  AGENTS.md
  LIBRARY.toml
  routines/
    AGENTS.md
    {routine-name}/
      AGENTS.md
      ROUTINE.toml
  product/
    AGENTS.md
    CONTEXT.md
    decisions/
    requirements/
  engineering/
    AGENTS.md
```

`.meta-harness.json` records the repository project name, local root, storage
locations, and source:

```json
{
  "schema": 1,
  "project": {
    "name": "project-name",
    "localRoot": "~/.project-name"
  },
  "storage": {
    "locations": [
      {
        "name": "repository",
        "description": "Checked-in repository storage location for Libraries discovered from repository Library manifests.",
        "driverName": "filesystem",
        "grants": [
          {
            "actors": ["actor://knowledge-agent"],
            "capabilities": ["read", "write", "delete", "query", "blob"]
          }
        ],
        "libraryRootPath": "{{repoRootPath}}",
        "discoveryMode": "filesystem-recursive",
        "discoveryExcludes": [
          "meta-harness/templates",
          "meta-harness/templates/**",
          "node_modules",
          "node_modules/**",
          "dist",
          "dist/**"
        ],
        "discoverLibraries": true,
        "sourceUri": "library://repository/.meta-harness.json",
        "guidanceUri": "library://meta-harness/storage/STORAGE.md"
      }
    ]
  },
  "source": {
    "type": "git",
    "url": "https://github.com/meetwudi/meta-harness.git",
    "ref": "source-ref"
  }
}
```

`project.name` is a filesystem-safe project name. `project.localRoot` is the
default local root for ignored or machine-local Libraries and runtime artifacts.
`storage.locations` is the repository-owned starting point for Library discovery.
Each storage location defines its driver, actor grants, Library root, discovery
mode, discovery excludes, and guidance URI.

`meta-harness/AGENTS.md` indexes Meta Harness docs. Each top-level `proj-*`
Library uses its own `AGENTS.md` for project-specific discovery.

## Operational Primitives

Standard operational primitive designs live under [primitives/](primitives/).

Primitives are named kinds of knowledge places organized by Libraries. A
repository is itself a Library, and its harness files can mark knowledge inside
it as Routine, Goal, Memory, Compliance, Spec, or another primitive kind.

- Routine: [primitives/ROUTINE.md](primitives/ROUTINE.md)
- Goal: [primitives/GOAL.md](primitives/GOAL.md)
- Library: [primitives/LIBRARY.md](primitives/LIBRARY.md)
- Memory: [primitives/MEMORY.md](primitives/MEMORY.md)
- Compliance: [primitives/COMPLIANCE.md](primitives/COMPLIANCE.md)
- Spec: [primitives/SPEC.md](primitives/SPEC.md)

Use [primitives/LIBRARY.md](primitives/LIBRARY.md) when a human asks to configure where project knowledge lives or how agents may access a knowledge source.

Use [primitives/COMPLIANCE.md](primitives/COMPLIANCE.md) when a human asks to create, change, clarify, or enforce repository rules, product requirements, engineering practices, AI policy, or other binding project obligations.

Use [primitives/SPEC.md](primitives/SPEC.md) when a human asks to structure specs as modular requirements, acceptance tests, and implementation citations.

## Installable Skill

Meta Harness ships a Codex skill under [skills/](skills/). The
`meta-harness` skill makes Meta Harness behavior available through Codex's
skill system while still reading the local repository's own harness docs and
the Knowledge Agent prompt.

Install the bundled skill into the current repository with:

```text
python3 meta-harness/tools/install-skills
```

By default this copies the skill to `.codex/skills/` in the repository. Use
`--codex-home` to install into `${CODEX_HOME:-~/.codex}/skills` instead.

## Compliance Docs

- AI policy: [compliance/AI-POLICY.md](compliance/AI-POLICY.md)
- Development principles: [compliance/DEVELOPMENT-PRINCIPLES.md](compliance/DEVELOPMENT-PRINCIPLES.md)
- Product harness: [compliance/PRODUCT.md](compliance/PRODUCT.md)
- Engineering practices: [compliance/ENGINEERING.md](compliance/ENGINEERING.md)

Meta Harness repositories should review repository-wide compliance with root `COMPLIANCE.toml`. They may copy the template from `meta-harness/templates/COMPLIANCE.toml`.

Project Libraries may add narrower compliance with `proj-*/COMPLIANCE.toml` or
more specific descendant compliance files.

Library definitions, Routine definitions, memory definitions, skill definitions, harness file metadata, and compliance attestations are enforced in PRs by the GitHub workflow template. Repositories may mirror checks with the git hook templates.
