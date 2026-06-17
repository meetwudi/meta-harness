# Compliance

Compliance is human-approved repository law: binding rules, constraints, requirements, policies, principles, and verification items for repository work.

Agents may clarify, format, deduplicate, or route compliance while preserving meaning. Agents must not create new compliance obligations unless the human explicitly approves them or the obligation already exists in sourced compliance.

## Required Notice

Every compliance file must begin with a notice that changes require human approval.

Default notice:

```text
> Compliance: This file contains human-approved repository rules. AI agents may not change compliance obligations in this file unless a human explicitly approves the change.
```

The notice must appear before the first heading in the compliance file.

## Library

Compliance may live inside any Library place.

For this repository, find Meta Harness compliance by exploring:

```text
library://meta-harness
```

The selected Library defines location and approval rules.

## Structured Compliance

Compliance applies to a Library and to descendant folders inside that Library.

Use `COMPLIANCE.toml` at a Library root for Library-wide compliance. Use descendant `COMPLIANCE.toml` files for narrower folder compliance. The file's location defines its scope: it applies to files in the same folder and its descendants.

For each PR, changed files must be checked against every applicable
`COMPLIANCE.toml` from the Library root through the changed file's directory.

`COMPLIANCE.toml` begins with a subagent review instruction:

```toml
# Harness-Compliance: Review applicable compliance with an independent subagent before attesting; if subagent use requires human approval, ask for approval.
```

If independent subagent review is required but unavailable, ask the human to
approve subagent use. If approval is denied or the review cannot be completed,
attest `blocked` rather than `pass`.

`COMPLIANCE.toml` includes verification items:

Use TOML comments for human context and durable review notes that should stay with the compliance file.

```toml
[[items]]
id = "meta-harness-compliance"
text = "Verify compliance from library://meta-harness."
```

For repository changes, applicable compliance should verify that:

- compliance changes have explicit human approval
- implementation changes follow applicable compliance
- AI-generated compliance content is not invented
- compliance clarifications preserve sourced meaning

AI agents must read each applicable compliance file, complete every relevant item, and leave a parseable commit-message attestation:

```text
Harness-Compliance: path=<path-to-COMPLIANCE.toml>; status=<status>
```

`<status>` is `pass`, `blocked`, or `na`. Use one attestation line per applicable compliance file.
