# Checklist Attestation

Any folder may define `CHECKLIST.md`.

Checklists make compliance reviewable. Compliance defines repository obligations; checklists define the checks required before a change is accepted.

Use a root `CHECKLIST.md` for repository-wide compliance. Use descendant `CHECKLIST.md` files for path-specific compliance.

For each PR, changed files must be checked against every `CHECKLIST.md` in their directory ancestry.

AI agents must read each applicable checklist, complete every relevant item, and leave a parseable commit-message attestation:

```text
Meta-Harness-Checklist: path=<path-to-CHECKLIST.md>; status=<status>
```

`<status>` is `pass`, `blocked`, or `na`. Use one attestation line per applicable checklist.

Compliance coverage belongs in checklists. If a compliance rule applies to a path, an applicable `CHECKLIST.md` should verify it.

PR enforcement belongs to Meta Harness. Managed projects should install the GitHub workflow template from `meta-harness/github/workflows/`; local hooks may mirror it for commit-time checks.
