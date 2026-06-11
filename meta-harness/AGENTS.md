# meta-harness/AGENTS.md

This file is the Meta Harness index.

## Discovery chain

Root entry point: [../AGENTS.md](../AGENTS.md)

Harness design: [HARNESS-DESIGN.md](HARNESS-DESIGN.md)

## Layers

- `meta-harness/`: The management layer copied from Meta Harness.
- `harness/`: The project-specific harness layer. It may be created by a project when project rules, specs, or workflows need their own progressive disclosure chain.
- `meta-harness/tools/`: Portable enforcement tools.
- `meta-harness/github/workflows/`: GitHub Actions workflow templates for managed projects.
