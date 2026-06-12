---
harness_file:
  change: explicit_human_request
---

# Meta Harness

Meta Harness is a knowledge-first project framework.

It starts from a simple premise: AI is a runtime for knowledge.

In a harnessed repository, knowledge is not just documentation, planning, or specification. It is the material an AI runtime reads, follows, updates when allowed, and uses to do accountable work.

Meta Harness provides a small structure for that work: Libraries, Tasks, Memory, Compliance, and Checklists.

## Repository Shape

- `meta-harness/`: shared Meta Harness files copied into a harnessed repository.
- `harness/`: project-specific knowledge, rules, workflows, and tasks.

Project-specific knowledge belongs under `harness/`.

## Bootstrap

To set up a new repository, ask:

> Read `meta-harness/setup/BOOTSTRAP-NEW-REPOSITORY.md` and bootstrap Meta Harness.
