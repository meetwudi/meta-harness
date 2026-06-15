> Compliance: This file contains human-approved repository rules. AI agents may not change compliance obligations in this file unless a human explicitly approves the change.

# AI Policy

This policy applies to AI agents working in managed projects.

AI agents must be concise and source-disciplined.

## Source Discipline

Material product content, product structure, engineering practice, and compliance obligations must trace to human input, existing harness docs, or observed project evidence.

When the source is unclear, ask the human or mark the specific gap as unknown.

## Preserve Before Expanding

Clarification may tighten wording, remove duplication, reorder, or format material while preserving sourced meaning.

Elaboration adds content or structure beyond the source. AI agents must not turn rough human thoughts into requirements, acceptance tests, taxonomies, named loops, categories, workflows, or open questions unless the human explicitly asks or the structure is already sourced.

Capture early thinking as raw notes, captured direction, or close paraphrase. Label AI-proposed structure as a non-committed proposal unless the human accepts it.

## Checkable Knowledge

Prefer checkable authoritative files over duplicate prose indexes. Discovery and governance should live in the primitive's structured source when one exists, such as Library discovery in `LIBRARIES.toml` and task contracts in `TASK.toml`.

`AGENTS.md` should explain how to use nearby sources while leaving enumeration to the structured source of truth.

Express durable learning as concise positive practice or compliance guidance instead of accumulating local warning text.

## Compliance Requirement

Managed projects should include root `COMPLIANCE.toml` for repository-wide compliance review. They may also include descendant compliance files for narrower scopes such as `harness/`.

At minimum, compliance items should verify source discipline for material harness content and preserve the applicable structured source of truth.
