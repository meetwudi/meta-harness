# 0001: Initial Harness Structure

## Status

Accepted

## Context

This repository should use a harness-driven approach: the project is guided by spec-as-code documents before implementation details are chosen.

The harness must also be reconstructable in future repositories by pointing an agent or human at a small number of source files.

## Decision

Use `AGENTS.md` files as the discovery chain for the harness:

```text
AGENTS.md
harness/
  AGENTS.md
  harness-design/
    AGENTS.md
    0001-initial-harness-structure.md
```

The root `AGENTS.md` is the harness entry point. It must state that AI agents are forbidden to change that file unless a human explicitly asks to change `AGENTS.md`.

Every harness document should be discoverable from the root by following links through `AGENTS.md` files. The harness design decisions live under `harness/harness-design/*.md`.

## Reconstruction

To add the same initial harness to another repository:

1. Create a root `AGENTS.md`.
2. Add the AI-change guardrail to the root `AGENTS.md`.
3. Link from the root `AGENTS.md` to `harness/AGENTS.md`.
4. Create `harness/AGENTS.md` as the harness index.
5. Create `harness/harness-design/AGENTS.md` as the design-decision index.
6. Record harness design decisions in `harness/harness-design/*.md`.

## Consequences

The harness has a stable entry point and a repeatable discovery pattern.

Future harness docs should not be hidden in unlinked folders. If a new harness area is added, it should be linked through the nearest `AGENTS.md` so the root discovery chain remains complete.
