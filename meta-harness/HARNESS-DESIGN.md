> Compliance: This file contains human-approved repository rules. AI agents may not change compliance obligations in this file unless a human explicitly approves the change.

# Harness Design

## Principles

Meta Harness defines how a managed project uses knowledge-first harness docs.

A managed project is a repository that carries `.meta-harness.json` and follows this design.

Development principles are defined in [compliance/DEVELOPMENT-PRINCIPLES.md](compliance/DEVELOPMENT-PRINCIPLES.md).

Meta Harness is self-managed: this repository uses the same marker and management layer that it provides to managed projects.

`meta-harness/` is the copied management layer. Managed projects must not modify files under `meta-harness/` directly; that layer should change only when updating from the Meta Harness source.

`harness/` is the project-specific harness layer. Project-specific rules, specs, workflows, and docs belong under `harness/`.

Harness docs use progressive disclosure through `AGENTS.md` files. A harness doc should be reachable from the root by following the `AGENTS.md` chain.

The root `AGENTS.md` is protected: AI agents may change it only when a human explicitly asks to change `AGENTS.md`.

## Managed Project Shape

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
    UPGRADE.md
    migrations/
      AGENTS.md
      {sequence}-{name}.md
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
harness/
  AGENTS.md
  LIBRARY.toml
  COMPLIANCE.toml
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

`.meta-harness.json` records the managed project name, local root, and Meta
Harness source:

```json
{
  "schema": 1,
  "project": {
    "name": "project-name",
    "localRoot": "~/.project-name"
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

To understand management-layer changes, managed projects compare source refs directly with `git diff` in the Meta Harness source repository:

```text
git diff <old-source-ref>..<new-source-ref> -- meta-harness/
```

Managed projects should use that diff as the change record instead of relying on an in-tree changelog.

`meta-harness/AGENTS.md` indexes Meta Harness docs. `harness/AGENTS.md` indexes project-specific harness docs.

Managed projects should place their own harness content under `harness/`, not by editing the copied `meta-harness/` management layer.

## Operational Primitives

Standard operational primitive designs live under [primitives/](primitives/).

Primitives are named kinds of knowledge places organized by Libraries. A managed codebase is itself a Library, and its harness files can mark knowledge inside it as Routine, Goal, Memory, Compliance, Spec, or another primitive kind.

- Routine: [primitives/ROUTINE.md](primitives/ROUTINE.md)
- Goal: [primitives/GOAL.md](primitives/GOAL.md)
- Library: [primitives/LIBRARY.md](primitives/LIBRARY.md)
- Memory: [primitives/MEMORY.md](primitives/MEMORY.md)
- Compliance: [primitives/COMPLIANCE.md](primitives/COMPLIANCE.md)
- Spec: [primitives/SPEC.md](primitives/SPEC.md)

Use [primitives/LIBRARY.md](primitives/LIBRARY.md) when a human asks to configure where project knowledge lives or how agents may access a knowledge source.

Use [primitives/COMPLIANCE.md](primitives/COMPLIANCE.md) when a human asks to create, change, clarify, or enforce repository rules, product requirements, engineering practices, AI policy, or other binding project obligations.

Use [primitives/SPEC.md](primitives/SPEC.md) when a human asks to structure specs as modular requirements, acceptance tests, and implementation citations.

## Installable Skills

Meta Harness may ship Codex skills under [skills/](skills/). These skills make shared harness behavior available through Codex's skill system while still reading the local repository's own harness docs.

Install bundled skills into the current repository with:

```text
python3 meta-harness/tools/install-skills
```

By default this copies skills to `.codex/skills/` in the repository. Use `--codex-home` to install into `${CODEX_HOME:-~/.codex}/skills` instead.

## Compliance Docs

- AI policy: [compliance/AI-POLICY.md](compliance/AI-POLICY.md)
- Development principles: [compliance/DEVELOPMENT-PRINCIPLES.md](compliance/DEVELOPMENT-PRINCIPLES.md)
- Product harness: [compliance/PRODUCT.md](compliance/PRODUCT.md)
- Engineering practices: [compliance/ENGINEERING.md](compliance/ENGINEERING.md)

Managed projects should review repository-wide compliance with root `COMPLIANCE.toml`. They may copy the template from `meta-harness/templates/COMPLIANCE.toml`.

Managed projects should review harness-specific compliance with `harness/COMPLIANCE.toml` or a more specific descendant compliance file. They may copy the template from `meta-harness/templates/harness/COMPLIANCE.toml`.

Library definitions, Routine definitions, memory definitions, skill definitions, harness file metadata, and compliance attestations are enforced in PRs by the GitHub workflow template. Managed projects may mirror checks with the git hook templates.
