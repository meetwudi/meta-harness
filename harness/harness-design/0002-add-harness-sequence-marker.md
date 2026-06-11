# 0002: Add Harness Sequence Marker

## Status

Accepted

## Context

Harness design decisions are recorded sequentially so future repositories can reconstruct or incrementally update the same harness structure.

The sequence needs a stable marker so humans and tools can identify which decisions have already been applied.

## Decision

Add `harness/harness-design/SEQUENCE.md` as the harness design sequence marker.

The marker records:

- the sequence name
- the current applied decision number
- the list of applied decision records
- the rule that future decisions are append-only and applied in order

## Consequences

A future migration mechanism can use `SEQUENCE.md` to detect the harness design state and apply missing decisions incrementally.

Design decisions remain readable Markdown, while the marker gives tooling a small stable surface to inspect.
