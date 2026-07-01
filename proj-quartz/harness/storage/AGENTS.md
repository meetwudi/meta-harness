# Quartz Storage Harness

This folder is the Quartz storage Spec entrypoint.

Before changing Quartz application persistence, Library storage configuration,
storage model knowledge, migration intent, or storage verification, read:

- [SPEC.toml](SPEC.toml)
- The relevant requirement files listed by the Spec
- The project storage model and migration-intent files linked by the Spec

Keep storage knowledge project-wide. Application surfaces such as the API may
reference this storage Spec, but they should not own separate persistence
models unless a human explicitly asks for that boundary.
