# Harness Design

## Context

Meta Harness defines a harness-driven approach: a project is guided by spec-as-code documents before implementation details are chosen.

This repository is the Meta Harness project: [meetwudi/meta-harness](https://github.com/meetwudi/meta-harness).

Meta Harness is self-managed: this repository applies the same marker and management structure that it provides to target repositories.

The harness must be reconstructable in future repositories by pointing an agent or human at a small number of source files.

## Structure

Use `AGENTS.md` files as the progressive disclosure chain:

```text
.meta-harness.json
AGENTS.md
meta-harness/
  AGENTS.md
  HARNESS-DESIGN.md
harness/
  AGENTS.md
```

The root `AGENTS.md` is the harness entry point. It must state that AI agents are forbidden to change that file unless a human explicitly asks to change `AGENTS.md`.

Every harness document should be discoverable from the root by following links through `AGENTS.md` files.

Managed repositories have a root `.meta-harness.json` marker that records the Meta Harness source. Meta Harness itself has this marker too.

## Layers

`meta-harness/` is the management layer copied from Meta Harness. It defines how the harness is discovered, updated, and interpreted.

`harness/` is the project-specific harness layer. It belongs to the target project and should not conflict with the Meta Harness management layer.

Meta Harness changes are tracked by Git. Target repositories can compare their `.meta-harness.json` source ref against the Meta Harness repository to understand what changed.

## Reconstruction

To add the same initial harness to another repository:

1. Create a root `AGENTS.md`.
2. Create a root `.meta-harness.json` marker.
3. Add the AI-change guardrail to the root `AGENTS.md`.
4. Link from the root `AGENTS.md` to `meta-harness/AGENTS.md`.
5. Create `meta-harness/AGENTS.md` as the management-layer index.
6. Create `meta-harness/HARNESS-DESIGN.md` as the consolidated harness design.
7. Create `harness/AGENTS.md` only when the project has project-specific harness docs to disclose.

## Consequences

The harness has a stable entry point and a repeatable discovery pattern.

The root `.meta-harness.json` marker gives tools a cheap way to identify a managed repository before walking the `AGENTS.md` discovery chain.

Meta Harness and project harness docs have separate locations, so management rules do not collide with project-specific rules.

Future harness docs should not be hidden in unlinked folders. If a new harness area is added, it should be linked through the nearest `AGENTS.md` so the root discovery chain remains complete.

## Changelog

- Consolidated the initial harness structure into `meta-harness/HARNESS-DESIGN.md`.
- Separated the Meta Harness management layer from the project-specific `harness/` layer.
- Simplified `.meta-harness.json` so Git refs and diffs, rather than local migration counters, describe Meta Harness changes.
