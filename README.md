---
harness_file:
  change: explicit_human_request
---

# Meta Harness

Meta Harness is a knowledge-first project framework.

It starts from a simple premise: AI is a runtime for knowledge.

In a harnessed repository, knowledge is not just documentation, planning, or specification. It is the material an AI runtime reads, follows, updates when allowed, and uses to do accountable work.

Meta Harness provides a small structure for that work: Libraries, Routines, Goals, Memory, Compliance, Specs, and Tags.

## Repository Shape

- `meta-harness/`: Meta Harness primitives, setup guidance, templates, tools, and runtime implementation.
- `proj-self-maintenance/`: repository self-maintenance project knowledge and Routines.

Top-level project Libraries use the `proj-` prefix.

## Bootstrap

To set up a new repository, ask:

> Read `meta-harness/setup/BOOTSTRAP-NEW-REPOSITORY.md` and bootstrap Meta Harness.
