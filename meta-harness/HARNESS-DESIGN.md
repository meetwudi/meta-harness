> Compliance: This file contains human-approved repository rules. AI agents may not change compliance obligations in this file unless a human explicitly approves the change.

# Harness Design

## Principles

Meta Harness defines how a managed project uses spec-as-code harness docs.

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
CHECKLIST.md
meta-harness/
  AGENTS.md
  HARNESS-DESIGN.md
  compliance/
    AI-POLICY.md
    DEVELOPMENT-PRINCIPLES.md
    PRODUCT.md
    ENGINEERING.md
  primitives/
    AGENTS.md
  templates/
    git-hooks/
    gitignore
  tools/
  github/
    workflows/
harness/
  AGENTS.md
  CHECKLIST.md
  tasks/
    AGENTS.md
    {task-name}/
      AGENTS.md
      TASK.toml
  libraries/
    AGENTS.md  # Library discovery instructions
    LIBRARIES.toml  # checked-in Library index
    LIBRARIES.local.toml  # ignored local Library index
  product/
    AGENTS.md
    CONTEXT.md
    decisions/
    requirements/
  engineering/
    AGENTS.md
```

`.meta-harness.json` records the Meta Harness source.

To understand management-layer changes, managed projects compare source refs directly with `git diff` in the Meta Harness source repository:

```text
git diff <old-source-ref>..<new-source-ref> -- meta-harness/
```

Managed projects should use that diff as the change record instead of relying on an in-tree changelog.

`meta-harness/AGENTS.md` indexes Meta Harness docs. `harness/AGENTS.md` indexes project-specific harness docs.

Managed projects should place their own harness content under `harness/`, not by editing the copied `meta-harness/` management layer.

## Operational Primitives

Standard operational primitive designs live under [primitives/](primitives/).

- Task: [primitives/TASK.md](primitives/TASK.md)
- Library: [primitives/LIBRARY.md](primitives/LIBRARY.md)
- Memory: [primitives/MEMORY.md](primitives/MEMORY.md)
- Compliance: [primitives/COMPLIANCE.md](primitives/COMPLIANCE.md)
- Checklist attestation: [primitives/CHECKLIST.md](primitives/CHECKLIST.md)

Use [primitives/LIBRARY.md](primitives/LIBRARY.md) when a human asks to configure where project knowledge lives or how agents may access a knowledge source.

Use [primitives/COMPLIANCE.md](primitives/COMPLIANCE.md) when a human asks to create, change, clarify, or enforce repository rules, product requirements, engineering practices, AI policy, or other binding project obligations.

## Compliance Docs

- AI policy: [compliance/AI-POLICY.md](compliance/AI-POLICY.md)
- Development principles: [compliance/DEVELOPMENT-PRINCIPLES.md](compliance/DEVELOPMENT-PRINCIPLES.md)
- Product harness: [compliance/PRODUCT.md](compliance/PRODUCT.md)
- Engineering practices: [compliance/ENGINEERING.md](compliance/ENGINEERING.md)

Managed projects should review repository-wide compliance with root `CHECKLIST.md`. They may copy the template from `meta-harness/templates/CHECKLIST.md`.

Managed projects should review harness-specific compliance with `harness/CHECKLIST.md` or a more specific descendant checklist. They may copy the template from `meta-harness/templates/harness/CHECKLIST.md`.

Library definitions, task definitions, and checklist attestations are enforced in PRs by the GitHub workflow template. Managed projects may mirror the same checks for commits with the commit hook template.
