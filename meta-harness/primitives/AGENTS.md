# Primitive Designs

This folder defines standard Meta Harness primitives.

## Primitive kinds

Meta Harness treats knowledge as code.

A primitive is a named kind of knowledge collection. The collection may be a
folder, database table, cloud knowledge base, documentation portal, API, or
another place addressable by a Library.

`designation` is only the prose word for marking a collection as a primitive.
Do not write a `designation` field.

Do not write `primitive_kind` in Library discovery metadata. Libraries choose places;
structured files inside those places identify contained primitives.

For folder-scoped primitives, the structured file is the marker. For example,
`LIBRARY.toml` marks a Library root, `ROUTINE.toml` marks a folder as a
Routine, `GOAL.toml` marks a Goal, `MEMORY.toml` marks a Memory collection,
`COMPLIANCE.toml` marks compliance rules for that folder and its descendants,
and `SPEC.toml` marks a Spec.

## Primitive docs

Routine: [ROUTINE.md](ROUTINE.md)

Goal: [GOAL.md](GOAL.md)

Library: [LIBRARY.md](LIBRARY.md)

Memory: [MEMORY.md](MEMORY.md)

Compliance: [COMPLIANCE.md](COMPLIANCE.md)

Spec: [SPEC.md](SPEC.md)
