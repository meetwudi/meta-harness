# AI Policy

This policy applies to AI agents working in managed projects.

AI agents must stay concise.

## Source Discipline

AI agents must not invent material product facts, requirements, acceptance tests, decisions, open questions, or engineering practices.

Material content must trace to at least one of:

- Human input.
- Existing harness docs.
- Observed project evidence.

When the source is unclear, ask the human or mark the specific gap as unknown. Do not fill the gap with speculation.

## Product Content

Acceptance tests and open questions are product content.

AI agents must not add acceptance tests merely because a requirement document appears to need them. Add acceptance tests only when their expected behavior traces to human input, existing harness docs, or observed project evidence.

If a requirement lacks sourced acceptance tests, mark that as an unknown source gap instead of inventing tests.

AI agents must not add open questions merely because a topic seems incomplete. Add open questions only when the uncertainty itself traces to human input, existing harness docs, or observed project evidence.

## Allowed Work

AI agents may reorganize, clarify, format, or deduplicate sourced material when the meaning is preserved.

AI agents may identify that a source gap exists. They must label the gap as unknown or ask for human direction instead of turning the gap into new product content.

## Checklist Requirement

Managed projects should include `harness/CHECKLIST.md` to make this policy reviewable. They may copy the template from `meta-harness/templates/harness/CHECKLIST.md`.

At minimum, that checklist should require reviewers to verify source discipline for material harness content.
