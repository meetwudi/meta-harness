# Checklist Attestation

Any folder may define `CHECKLIST.md`.

For each PR, changed files must be checked against every `CHECKLIST.md` in their directory ancestry.

AI agents must read each applicable checklist, complete every relevant item, and leave a parseable commit-message attestation:

```text
Meta-Harness-Checklist: path=<path-to-CHECKLIST.md>; status=<status>
```

`<status>` is `pass`, `blocked`, or `na`. Use one attestation line per applicable checklist.

PR enforcement belongs to Meta Harness. Managed projects should install the GitHub workflow template from `meta-harness/github/workflows/`; local hooks may mirror it but are not authoritative.
