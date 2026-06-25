# PROJ-Quartz Harness

This folder is the project-local harness and Spec entrypoint for PROJ-Quartz.

Before changing project behavior, framework/library choices, storage direction,
runtime rules, prompts, or validation expectations, read:

- [SPEC.toml](SPEC.toml)
- The relevant requirement files listed by the Spec
- The relevant acceptance-test files listed by the Spec, when present

Keep changes spec-first. When a human states a requirement, transcribe it into
this harness before implementation code. Do not invent, split, merge, or
elaborate requirements beyond the human-stated meaning.

Acceptance tests are not generated from requirements. Add, change, or delete
acceptance-test files only when a human explicitly requests or approves that
acceptance-test change, or when the acceptance-test content is already sourced.
