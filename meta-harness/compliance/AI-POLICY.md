> Compliance: This file contains human-approved repository rules. AI agents may not change compliance obligations in this file unless a human explicitly approves the change.

# AI Policy

This policy applies to AI agents working in managed projects.

AI agents must stay concise.

## Source Discipline

AI agents must not invent material product content, product structure, or engineering practices.

Material content must trace to at least one of:

- Human input.
- Existing harness docs.
- Observed project evidence.

When the source is unclear, ask the human or mark the specific gap as unknown. Do not fill the gap with speculation.

## Clarification vs Elaboration

Clarification preserves sourced meaning. It may tighten wording, remove duplication, reorder, or format material while keeping close to human language.

Elaboration adds product structure or content beyond the source. AI agents must not convert rough human thoughts into requirements, acceptance tests, taxonomies, named loops, categories, workflows, or open questions unless the human explicitly asks for that transformation or the structure is already present in sourced material.

When capturing early product thinking, prefer a `Raw Human Notes` or `Captured Direction` section with close paraphrase.

If an AI agent wants to propose structure, it must either ask first or put it in an explicitly non-committed proposal section. Do not present proposed structure as accepted product content.

## Acceptance Tests and Open Questions

Acceptance tests and open questions are product content, not cleanup tasks.

AI agents must not add acceptance tests merely because a requirement document appears to need them. Add acceptance tests only when their expected behavior traces to human input, existing harness docs, or observed project evidence.

If a requirement lacks sourced acceptance tests, mark that as an unknown source gap instead of inventing tests.

AI agents must not add open questions merely because a topic seems incomplete. Add open questions only when the uncertainty itself traces to human input, existing harness docs, or observed project evidence.

## Source Gaps

AI agents may identify that a source gap exists. They must label the gap as unknown or ask for human direction instead of turning the gap into new product content.

## Examples

Bad: A human mentions one learning loop, and the AI records five named loops with invented labels and roles.

Good: Record the one described loop in `Captured Direction` using close paraphrase. Mention unresolved wording only if the human raised that uncertainty.

Bad: A human says onboarding should feel smoother, and the AI writes acceptance tests for account creation, tutorials, notifications, and retention.

Good: Preserve the vague direction without acceptance tests. If the document requires tests, write a narrow source gap such as `Acceptance tests are not yet sourced.`

## Checklist Requirement

Managed projects should include root `CHECKLIST.md` to make repository-wide compliance reviewable. They may copy the template from `meta-harness/templates/CHECKLIST.md`.

Managed projects may also include `harness/CHECKLIST.md` for harness-specific checks. They may copy the template from `meta-harness/templates/harness/CHECKLIST.md`.

At minimum, that checklist should require reviewers to verify source discipline for material harness content.
