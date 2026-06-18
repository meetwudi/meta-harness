# Spec

A Spec is a modular requirement map.

Specs live in a Library. `SPEC.toml` marks a place as a Spec primitive and
points agents to requirement collections and acceptance-test collections.

A Spec is not a long prose document. It is a structured map to smaller,
citable requirement files and separate acceptance-test files.

## Shape

```text
{spec-root}/
  AGENTS.md
  SPEC.toml
  requirements/
    {requirement-id}.toml
  acceptance-tests/
    {acceptance-test-id}.toml
  impl/
    ...
```

Specs lead to implemented, fully harnessed generated code. Generated files
should begin with a comment that tells humans not to edit generated output
directly and to update the Spec first.

Implementation generated from a Spec lives under the Spec root in folders
relative to `SPEC.toml`. Do not place Spec-owned implementation in a central
repository tool folder unless the human explicitly asks for that layout.

Generated implementation code should be modular. Use one function per file.
Each function must have a docstring that explains what the function does.

Every generated implementation file must start with:

- the generated-file notice
- the requirement IDs the file supports, when it supports requirements
- a short explanation of how the function or file supports those requirements

Example generated-file notice:

```text
Generated file. Do not edit directly; update the Spec first.
```

## Definition

`SPEC.toml` includes:

- `name`
- `version`
- `source`
- `[[requirement_collections]]`
- `[[acceptance_test_collections]]`

Example:

```toml
name = "knowledge-agent"
version = "v0.0.0"
source = "Human request captured on 2026-06-17."

[[requirement_collections]]
name = "requirements"
location = "requirements"

[[acceptance_test_collections]]
name = "acceptance-tests"
location = "acceptance-tests"
```

Each collection includes:

- `name`
- `location`

## Requirements

Requirement files are modular source-traceable statements. Requirements must be
listed explicitly by a human, one by one.

AI agents must not create, infer, split, merge, elaborate, or add requirements.
When a human states requirements, AI agents may transcribe those requirements
into requirement files while preserving the human-stated meaning. If the source
requirement is unclear, ask the human instead of inventing a requirement.

Each requirement file includes:

- `id`
- `title`
- `source`
- `text`

Requirement IDs are stable identifiers intended for implementation citation.
Use lowercase dotted identifiers, such as:

```text
knowledge-agent.library-index-goal-input
```

## Acceptance Tests

Acceptance-test files are separate from requirements because one acceptance test
may verify one requirement or a collection of requirements.

Acceptance tests must live outside the requirements folder.

Each acceptance-test file includes:

- `id`
- `title`
- `requirements`
- `procedure`
- `expected`

The `requirements` field contains requirement IDs.

## Implementation Citations

Implementation code cites requirements with this parseable token:

```text
Harness-Requirement: <requirement-id>
```

Acceptance-test files do not satisfy implementation citation coverage.

Pre-commit hooks and repository checks should fail when a requirement lacks an
implementation citation in checked implementation code.

## Governance

Spec updates are spec-first. Update `SPEC.toml`, requirements, and acceptance
tests before implementation code when behavior, interfaces, prompts, provider
choices, runtime rules, or validation expectations change.
