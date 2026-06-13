# Bootstrap New Repository

Use this guide to set up a new harnessed repository.

## Setup

Copy `meta-harness/` into the repository as-is.

Do not change copied files under `meta-harness/` for project-specific needs.

Optionally install bundled Codex skills into the repository:

```text
python3 meta-harness/tools/install-skills
```

Create project-specific harness content under `harness/`.

Add `.meta-harness.json` to record the Meta Harness source.

Use [../HARNESS-DESIGN.md](../HARNESS-DESIGN.md) for the expected repository shape.

## Agent Prompt

Ask Codex or Claude Code:

> Adopt Meta Harness in this repository. Copy `meta-harness/` as-is, add `.meta-harness.json`, and create project-specific harness content under `harness/`. Use `meta-harness/setup/BOOTSTRAP-NEW-REPOSITORY.md` and `meta-harness/HARNESS-DESIGN.md` as the source docs.
