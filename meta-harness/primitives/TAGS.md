# Tags

Tags are independent retrieval metadata for knowledge.

Tags live in a Library. `TAGS.toml` marks the containing folder or equivalent
place as a tagged knowledge scope.

Tags help agents and tools quickly find candidate knowledge. A tag match is a
retrieval signal; agents still read the matched knowledge before using it.

## Shape

A filesystem Library may use this shape:

```text
{knowledge-scope}/
  TAGS.toml
```

The scope is the place where `TAGS.toml` lives. If `TAGS.toml` lives beside
`ROUTINE.toml`, it tags that Routine scope. If it lives at a Library root, it
tags that Library scope. If it lives in another folder, it tags that folder as a
knowledge scope.

Other primitives do not need to include tag fields. Tags compose with
Libraries, Routines, Goals, Memory, Compliance, Specs, and other knowledge by
placing `TAGS.toml` in the relevant scope.

## Definition

`TAGS.toml` includes:

- `tags`

Example:

```toml
# This is a Harness primitive.
# See also: library://meta-harness

tags = [
  "retrieval",
  "routine/planning",
]
```

`tags` is a list of non-empty strings.

Tag values may use slash-separated namespace-like strings when a human wants
that shape, such as `routine/planning`. Namespaces are part of the tag string;
the Tags primitive does not make them an ontology.

## Query

Query by tags should be structured. A query by tags filters knowledge scopes by
tag values declared in `TAGS.toml` records.

Storage may help query by tags by discovering or indexing tag records in the
backend. Filesystem storage can discover `TAGS.toml` records inside readable
Library scopes.

Query-by-tags results identify matching knowledge scopes with Library resource
URIs. The caller reads the matched knowledge through the Library before acting.
