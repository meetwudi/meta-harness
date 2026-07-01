# Quartz API Harness

This folder is the Quartz API-layer Spec.

Before changing API behavior, authentication, API-key actor behavior, Library
ingestion, or API validation expectations, read:

- [SPEC.toml](SPEC.toml)
- The relevant requirement files listed by the Spec
- The relevant storage-model and migration-intent files listed by the Spec
- The relevant integration-test files listed by the Spec, when present

Keep changes spec-first. When a human states a requirement, transcribe it here
before implementation code. Do not invent, split, merge, or elaborate
requirements beyond the human-stated meaning.
