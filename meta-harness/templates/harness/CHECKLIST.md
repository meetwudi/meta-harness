# Harness Checklist

Use this checklist for changes under `harness/`.

- Verify material code changes are preceded by applicable spec updates, or the PR explains why no spec update is needed.
- Verify material product content, product structure, or engineering practice added or changed in harness docs traces to human input, existing harness docs, or observed project evidence.
- Verify rough early product thinking stays in `Raw Human Notes`, `Captured Direction`, or close paraphrase instead of becoming requirements, acceptance tests, taxonomies, named loops, categories, workflows, or open questions.
- Verify acceptance tests are sourced. If a requirement lacks sourced acceptance tests, mark that as an unknown source gap instead of inventing tests.
- Verify open questions are sourced. Do not add open questions merely because a topic seems incomplete.
- Verify AI-proposed structure is labeled as a non-committed proposal or was requested before being added.
- Verify AI-generated speculation has not been committed as product content or structure.
- Verify reorganized, clarified, formatted, or deduplicated material preserves the meaning of the sourced material.
- Verify discovery and governance use the applicable structured source of truth instead of duplicate prose indexes.
- Verify Library definitions point to real places and declare a primitive kind.
- Verify checked-in Library definitions are valid in `LIBRARIES.toml`.
- Verify `harness/libraries/LIBRARIES.toml` lists shared repo-safe Libraries.
- Verify local Library entries belong in ignored `harness/libraries/LIBRARIES.local.toml` and do not weaken checked-in governance.
- Verify memory-capable Libraries use the configured local or external location.
- Verify Library memory updates preserve source discipline and do not invent product content.
- Verify task definitions include valid `TASK.toml`.
- Verify compliance files begin with the required human-approval notice.
- Verify compliance obligation changes have explicit human approval.
- Verify compliance files identify applicable `CHECKLIST.md` files.
- Verify checklists cover applicable compliance obligations.
