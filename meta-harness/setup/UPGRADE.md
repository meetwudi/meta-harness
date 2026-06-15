# Upgrade

Use this guide when a harnessed repository upgrades its copied `meta-harness/` files.

## Compare

Find the old and new Meta Harness source refs from `.meta-harness.json`, release notes, or the human-provided upgrade request.

Review the source diff:

```text
git diff <old-source-ref>..<new-source-ref> -- meta-harness/
```

Use that diff to understand what changed before editing the managed repository.

## Migrations

Review [migrations/AGENTS.md](migrations/AGENTS.md).

For each migration, check whether the upgrade crosses the migration commit.

Apply every crossed migration in order.

## Plan

Do not blindly copy files.

Walk through the existing harness setup:

- `AGENTS.md`
- `COMPLIANCE.toml`
- `.meta-harness.json`
- `meta-harness/`
- `harness/`
- installed skills from `meta-harness/skills/`
- installed git hooks and GitHub workflows
- setup migrations crossed by the upgrade

Identify what must change because of the Meta Harness update and why.

## Approval

Ask the human to approve the upgrade plan before applying changes.

The approval request should summarize:

- changed Meta Harness files
- required project-specific harness changes
- workflow or hook changes
- risks or follow-up work

After approval, apply the update and run the Meta Harness checks.
