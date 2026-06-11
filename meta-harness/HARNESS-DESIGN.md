# Harness Design

## Context

Meta Harness defines a harness-driven approach: a managed project is guided by spec-as-code documents before implementation details are chosen.

This repository is the Meta Harness project: [meetwudi/meta-harness](https://github.com/meetwudi/meta-harness).

Meta Harness is self-managed: this repository applies the same marker and management structure that it provides to managed projects.

The harness must be reconstructable in future repositories by pointing an agent or human at a small number of source files.

Throughout Meta Harness, a "managed project" means a repository that carries `.meta-harness.json` and follows the Meta Harness structure.

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
  product/
    AGENTS.md
    CONTEXT.md
    decisions/
    requirements/
  engineering/
    AGENTS.md
```

The root `AGENTS.md` is the harness entry point. It must state that AI agents are forbidden to change that file unless a human explicitly asks to change `AGENTS.md`.

Every harness document should be discoverable from the root by following links through `AGENTS.md` files.

Managed repositories have a root `.meta-harness.json` marker that records the Meta Harness source. Meta Harness itself has this marker too.

## Layers

`meta-harness/` is the management layer copied from Meta Harness. It defines how the harness is discovered, updated, and interpreted.

`harness/` is the project-specific harness layer. It belongs to the managed project and should not conflict with the Meta Harness management layer.

Meta Harness changes are tracked by Git. Managed projects can compare their `.meta-harness.json` source ref against the Meta Harness repository to understand what changed.

## Managed Project Harness

Each managed project should use `harness/` for project-specific rules and specs.

`harness/product/CONTEXT.md` records the product context: what the product is, who it is for, and what outcomes matter.

`harness/product/decisions/` records product decisions sequentially. Use this for decision history, not consolidated requirements.

`harness/product/requirements/` records modular product requirements. Each requirement must include acceptance tests that can actually be tested.

`harness/engineering/` records project-level engineering practices. It may start empty except for `AGENTS.md`.

## AI Policy

AI agents must stay concise.

AI agents must not invent material product facts, requirements, decisions, or engineering practices. Material content should trace to human input, an existing harness doc, or observed project evidence.

When the source is unclear, record uncertainty or ask the human instead of filling gaps with plausible-sounding text.

## Engineering Practices

Meta Harness defines the separation between Meta Harness rules and project engineering practices.

Project-specific engineering practices belong under `harness/engineering/` in the managed project.

Meta Harness does not impose default engineering practices yet.

## Reconstruction

To add the same initial harness to another repository:

1. Create a root `AGENTS.md`.
2. Create a root `.meta-harness.json` marker.
3. Add the AI-change guardrail to the root `AGENTS.md`.
4. Link from the root `AGENTS.md` to `meta-harness/AGENTS.md`.
5. Create `meta-harness/AGENTS.md` as the management-layer index.
6. Create `meta-harness/HARNESS-DESIGN.md` as the consolidated harness design.
7. Create `harness/AGENTS.md` for project-specific harness docs.
8. Create `harness/product/CONTEXT.md`.
9. Create `harness/product/decisions/` for sequential product decisions.
10. Create `harness/product/requirements/` for modular requirements with acceptance tests.
11. Create `harness/engineering/AGENTS.md` for project-level engineering practices.

## Consequences

The harness has a stable entry point and a repeatable discovery pattern.

The root `.meta-harness.json` marker gives tools a cheap way to identify a managed repository before walking the `AGENTS.md` discovery chain.

Meta Harness and project harness docs have separate locations, so management rules do not collide with project-specific rules.

Future harness docs should not be hidden in unlinked folders. If a new harness area is added, it should be linked through the nearest `AGENTS.md` so the root discovery chain remains complete.

Product decisions and product requirements have separate locations, so history does not blur into the current consolidated requirement set.

## Changelog

- Consolidated the initial harness structure into `meta-harness/HARNESS-DESIGN.md`.
- Separated the Meta Harness management layer from the project-specific `harness/` layer.
- Simplified `.meta-harness.json` so Git refs and diffs, rather than local migration counters, describe Meta Harness changes.
- Added managed-project terminology, product context, sequential product decisions, modular requirements with acceptance tests, concise AI policy, and project engineering practice placement.
