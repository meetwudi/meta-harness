# meta-harness/AGENTS.md

This file is the Meta Harness index.

## Discovery chain

Root entry point: [../AGENTS.md](../AGENTS.md)

Harness design: [HARNESS-DESIGN.md](HARNESS-DESIGN.md)

Primitive orientation: [PRIMITIVE-ORIENTATION.md](PRIMITIVE-ORIENTATION.md)

Project harness: [../harness/AGENTS.md](../harness/AGENTS.md)

Primitive designs: [primitives/AGENTS.md](primitives/AGENTS.md)

Development principles: [compliance/DEVELOPMENT-PRINCIPLES.md](compliance/DEVELOPMENT-PRINCIPLES.md)

AI policy: [compliance/AI-POLICY.md](compliance/AI-POLICY.md)

Compliance docs: [compliance/AGENTS.md](compliance/AGENTS.md)

Harness checklist template: [templates/harness/CHECKLIST.md](templates/harness/CHECKLIST.md)

Task index template: [templates/harness/tasks/AGENTS.md](templates/harness/tasks/AGENTS.md)

Library discovery template: [templates/harness/libraries/AGENTS.md](templates/harness/libraries/AGENTS.md)

Library index template: [templates/harness/libraries/LIBRARIES.toml](templates/harness/libraries/LIBRARIES.toml)

Repository checklist template: [templates/CHECKLIST.md](templates/CHECKLIST.md)

Commit hook template: [templates/git-hooks/commit-msg](templates/git-hooks/commit-msg)

Gitignore template: [templates/gitignore](templates/gitignore)

## Layers

- `meta-harness/`: The management layer copied from Meta Harness. Managed projects must not modify this layer directly; update it only from the Meta Harness source.
- `harness/`: The project-specific harness layer. It may be created by a project when project rules, specs, or workflows need their own progressive disclosure chain.
- `meta-harness/primitives/`: Standard harness primitive designs.
- `meta-harness/compliance/`: Human-approved compliance examples and management-layer rules.
- `meta-harness/templates/`: Copyable templates for managed projects.
- `meta-harness/tools/`: Portable enforcement tools.
- `meta-harness/github/workflows/`: GitHub Actions workflow templates for managed projects.
