# Compliance

Compliance is human-approved repository law.

Compliance defines binding rules, constraints, requirements, policies, and principles for repository work.

Agents may clarify, format, deduplicate, or route compliance while preserving meaning. Agents must not create new compliance obligations unless the human explicitly approves them or the obligation already exists in sourced compliance.

## Required Notice

Every compliance file must begin with a notice that changes require human approval.

Default notice:

```text
> Compliance: This file contains human-approved repository rules. AI agents may not change compliance obligations in this file unless a human explicitly approves the change.
```

The notice must appear before the first heading in the compliance file.

## Library

Repo-backed compliance should use the repo Library:

```text
library://repo/compliance/{path}
```

Examples:

```text
library://repo/compliance/ai-policy
library://repo/compliance/development-principles
library://repo/compliance/product/context
library://repo/compliance/product/requirements/{requirement-name}
library://repo/compliance/engineering/practices
```

The selected Library defines location and approval rules.

## Checklist

Checklists turn compliance into reviewable checks.

Compliance defines obligations. `CHECKLIST.md` files define verification.

For repository changes, applicable checklists should verify that:

- compliance changes have explicit human approval
- implementation changes follow applicable compliance
- AI-generated compliance content is not invented
- compliance clarifications preserve sourced meaning

Compliance files should identify the root or path-specific `CHECKLIST.md` files that verify them. Checklist attestations are the commit and PR evidence that applicable compliance was checked.

## Tasks

Tasks must obey applicable compliance. A task may read compliance through Library paths, propose compliance changes, or update checklists that enforce compliance.
