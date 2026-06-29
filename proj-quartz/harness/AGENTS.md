# PROJ-Quartz Harness

This folder is the project-local harness and Spec entrypoint for PROJ-Quartz.

Before changing project behavior, framework/library choices, storage direction,
runtime rules, prompts, or validation expectations, read:

- [SPEC.toml](SPEC.toml)
- The relevant requirement files listed by the Spec
- The relevant integration-test files listed by the Spec, when present
- [acceptance/ACCEPTANCE.toml](acceptance/ACCEPTANCE.toml) for end-to-end
  acceptance scenarios

Keep changes spec-first. When a human states a requirement, transcribe it into
this harness before implementation code. Do not invent, split, merge, or
elaborate requirements beyond the human-stated meaning.

Acceptance scenarios are not generated from requirements. Add, change, or delete
Acceptance scenarios only when a human explicitly requests or approves that
acceptance change, or when the acceptance content is already sourced.
