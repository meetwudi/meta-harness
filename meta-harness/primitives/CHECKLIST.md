# Checklist Attestation

Any folder may define `CHECKLIST.toml`.

Checklists make compliance reviewable. Compliance defines repository obligations; checklists define the checks required before a change is accepted.

Use a root `CHECKLIST.toml` for repository-wide compliance. Use descendant `CHECKLIST.toml` files for path-specific compliance.

For each PR, changed files must be checked against every `CHECKLIST.toml` in their directory ancestry.

## Shape

`CHECKLIST.toml` includes:

- name
- scope
- purpose
- Library references to read
- checklist items

Use TOML comments for human context and durable review notes that should stay with the checklist.

```toml
name = "repository"
scope = "."
purpose = "Review repository-wide compliance before accepting changes."

libraries = [
  "library://meta-harness",
]

[[items]]
id = "meta-harness-compliance"
text = "Verify compliance from library://meta-harness."
```

AI agents must read each applicable checklist, complete every relevant item, and leave a parseable commit-message attestation:

```text
Meta-Harness-Checklist: path=<path-to-CHECKLIST.toml>; status=<status>
```

`<status>` is `pass`, `blocked`, or `na`. Use one attestation line per applicable checklist.

Compliance coverage belongs in checklists. If a compliance rule applies to a path, an applicable `CHECKLIST.toml` should verify it.

PR enforcement belongs to Meta Harness. Managed projects should install the GitHub workflow template from `meta-harness/github/workflows/`; local hooks may mirror it for commit-time checks.
