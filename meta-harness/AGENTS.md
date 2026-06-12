# meta-harness/AGENTS.md

This file is the Meta Harness index.

## Discovery chain

Root entry point: [../AGENTS.md](../AGENTS.md)

Harness design: [HARNESS-DESIGN.md](HARNESS-DESIGN.md)

Primitive designs: [primitives/AGENTS.md](primitives/AGENTS.md)

Development principles: [DEVELOPMENT-PRINCIPLES.md](DEVELOPMENT-PRINCIPLES.md)

AI policy: [AI-POLICY.md](AI-POLICY.md)

Harness checklist template: [templates/harness/CHECKLIST.md](templates/harness/CHECKLIST.md)

## Layers

- `meta-harness/`: The management layer copied from Meta Harness. Managed projects must not modify this layer directly; update it only from the Meta Harness source.
- `harness/`: The project-specific harness layer. It may be created by a project when project rules, specs, or workflows need their own progressive disclosure chain.
- `meta-harness/primitives/`: Standard harness primitive designs.
- `meta-harness/templates/`: Copyable templates for managed projects.
- `meta-harness/tools/`: Portable enforcement tools.
- `meta-harness/github/workflows/`: GitHub Actions workflow templates for managed projects.
