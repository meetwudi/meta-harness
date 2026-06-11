# Harness Design

## Principles

Meta Harness defines how a managed project uses spec-as-code harness docs.

A managed project is a repository that carries `.meta-harness.json` and follows this design.

Meta Harness is self-managed: this repository uses the same marker and management layer that it provides to managed projects.

`meta-harness/` is the copied management layer. `harness/` is the project-specific harness layer.

Harness docs use progressive disclosure through `AGENTS.md` files. A harness doc should be reachable from the root by following the `AGENTS.md` chain.

The root `AGENTS.md` is protected: AI agents may change it only when a human explicitly asks to change `AGENTS.md`.

## Managed Project Shape

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

`.meta-harness.json` records the Meta Harness source. Managed projects compare that source ref against Meta Harness to understand what changed.

`meta-harness/AGENTS.md` indexes Meta Harness docs. `harness/AGENTS.md` indexes project-specific harness docs.

## Product Harness

Each managed project records product context in `harness/product/CONTEXT.md`: what the product is, who it is for, and what outcomes matter.

Product decisions are recorded sequentially in `harness/product/decisions/`. Use this for decision history.

Product requirements are recorded modularly in `harness/product/requirements/`. Each requirement must include acceptance tests that can actually be tested.

## AI Policy

AI agents must stay concise.

AI agents must not invent material product facts, requirements, decisions, or engineering practices.

Material content must trace to human input, harness docs, or observed project evidence. When the source is unclear, ask or mark the gap as unknown.

## Engineering Practices

Project-specific engineering practices belong under `harness/engineering/` in the managed project.

Meta Harness does not impose default engineering practices.

## Changelog

- Consolidated Meta Harness into `meta-harness/HARNESS-DESIGN.md`.
- Separated `meta-harness/` management docs from project-specific `harness/` docs.
- Defined managed project product context, product decisions, modular requirements with acceptance tests, AI policy, and engineering practice placement.
