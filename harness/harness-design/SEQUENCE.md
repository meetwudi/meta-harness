# Harness Design Sequence

Sequence: `meta-harness-design`

Current: `0003`

Applied:

- `0001-initial-harness-structure.md`
- `0002-add-harness-sequence-marker.md`
- `0003-use-meta-harness-project-identity.md`

## Rule

Append-only design decisions use zero-padded sequence numbers. A future harness migration mechanism should compare `Current` and `Applied` against available design decisions, then apply missing decisions in order.
