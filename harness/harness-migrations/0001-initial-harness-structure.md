# 0001: Initial Harness Structure

## Context

This repository should use a harness-driven approach: the project is guided by spec-as-code documents before implementation details are chosen.

This repository is the Meta Harness project: [meetwudi/meta-harness](https://github.com/meetwudi/meta-harness).

Meta Harness is self-managed: this repository applies the same harness marker and migration structure that it provides to target repositories.

The harness must also be reconstructable in future repositories by pointing an agent or human at a small number of source files.

## Decision

Use `AGENTS.md` files as the discovery chain for the harness:

```text
.meta-harness.json
AGENTS.md
harness/
  AGENTS.md
  harness-migrations/
    AGENTS.md
    0001-initial-harness-structure.md
```

The root `AGENTS.md` is the harness entry point. It must state that AI agents are forbidden to change that file unless a human explicitly asks to change `AGENTS.md`.

Every harness document should be discoverable from the root by following links through `AGENTS.md` files. The harness migration records live under `harness/harness-migrations/*.md`.

Managed repositories have a root `.meta-harness.json` marker that records the Meta Harness source and the applied harness migrations. Meta Harness itself has this marker too.

## Reconstruction

To add the same initial harness to another repository:

1. Create a root `AGENTS.md`.
2. Create a root `.meta-harness.json` marker.
3. Add the AI-change guardrail to the root `AGENTS.md`.
4. Link from the root `AGENTS.md` to `harness/AGENTS.md`.
5. Create `harness/AGENTS.md` as the harness index.
6. Create `harness/harness-migrations/AGENTS.md` as the migration index.
7. Record harness migrations in `harness/harness-migrations/*.md`.

## Consequences

The harness has a stable entry point and a repeatable discovery pattern.

The root `.meta-harness.json` marker gives tools a cheap way to identify a managed repository before walking the `AGENTS.md` discovery chain.

Future harness docs should not be hidden in unlinked folders. If a new harness area is added, it should be linked through the nearest `AGENTS.md` so the root discovery chain remains complete.
