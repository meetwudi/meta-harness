# Spec

A Spec is a modular requirement map.

Specs live in a Library. `SPEC.toml` marks a place as a Spec primitive and
points agents to requirement collections, integration-test collections, and any
test guidance or executable test maps the Spec declares.

A Spec is not a long prose document. It is a structured map to smaller,
citable requirement files and implementation-facing integration-test files.

## Shape

```text
{spec-root}/
  AGENTS.md
  SPEC.toml
  requirements/
    {requirement-id}.toml
  test-guidelines/
    integration.md
  integration-tests/
    {integration-test-id}.toml
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

`SPEC.toml` may also include:

- `[[test_guideline_collections]]`
- `[[integration_test_collections]]`
- `[[storage_model_collections]]`
- `[[migration_intent_collections]]`

Example:

```toml
name = "knowledge-agent"
version = "v0.0.0"
source = "Human request captured on 2026-06-17."

[[requirement_collections]]
name = "requirements"
location = "requirements"

[[test_guideline_collections]]
name = "test-guidelines"
location = "test-guidelines"

[[integration_test_collections]]
name = "integration-tests"
location = "integration-tests"
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
knowledge-agent.storage-discovery-runtime
```

## Test Guidelines

Specs may include test-guideline collections for guidance that applies across
integration tests.

Guideline files may be Markdown when the guidance is prose. Test guidelines
should explain testing style, boundaries, fixtures, storage setup, and when to
prefer real collaborators over mocks.

## Integration Tests

Integration-test files describe runnable tests that verify multiple implemented
parts together. Integration tests are separate from acceptance tests because an
acceptance test describes user-visible success, while an integration test may
describe a concrete executable verification path.

Each integration-test file includes:

- `id`
- `title`
- `requirements`
- `procedure`
- `expected`

The `requirements` field contains requirement IDs.

## Storage Models

Specs may include storage-model collections for human-authored persistence
intent. Storage-model records describe backend-neutral entities, relationships,
invariants, ownership, durability, sensitivity, and retrieval behavior in
natural language.

Storage-model records are source knowledge for generated logical data-model
definitions, backend-specific schema definitions, migration artifacts, and
verification tests. Executable schema and migration artifacts belong in
generated implementation files that cite the relevant requirement and
storage-model IDs.

Each storage-model file includes:

- `id`
- `title`
- `source`
- `requirements`
- `text`

Storage-model files may include:

- `statements`

## Migration Intents

Specs may include migration-intent collections for human-authored migration
intent. Migration-intent records describe the semantic source state, target
state, preservation expectations, generated artifact expectations, and
verification criteria for schema and data changes.

Migration-intent records are source knowledge for generated migration plans,
backend-specific executable scripts, data migration scripts, and migration
verification tests.

Each migration-intent file includes:

- `id`
- `title`
- `source`
- `requirements`
- `text`

Migration-intent files may include:

- `statements`
- `implementation_artifacts`

`implementation_artifacts` lists generated or handwritten migration artifacts
that implement the migration intent, as repository-relative paths.

Executable migration artifacts cite their source migration intent with this
parseable token:

```text
Harness-Migration-Intent: <migration-intent-id>
```

Do not keep one-off migration scripts outside Spec migration-intent knowledge.
When a migration script is needed, record the semantic migration as a migration
intent first, list the artifact from that intent, and cite the migration intent
from the artifact.

## Implementation Citations

Implementation code cites requirements with this parseable token:

```text
Harness-Requirement: <requirement-id>
```

Acceptance primitives do not satisfy implementation citation coverage.

Pre-commit hooks and repository checks should fail when a requirement lacks an
implementation citation in checked implementation code.

## Governance

Spec updates are spec-first. Update `SPEC.toml` and human-listed requirements
before implementation code when behavior, interfaces, prompts, provider
choices, runtime rules, or validation expectations change. Update test
guidelines or integration tests when those expectations change. Use the
Acceptance primitive for end-to-end acceptance scenarios.
