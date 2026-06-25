# PROJ-Quartz Harness

This folder is the project-local harness and Spec entrypoint for PROJ-Quartz.

Before changing project behavior, framework/library choices, storage direction,
runtime rules, prompts, or validation expectations, read:

- [SPEC.toml](SPEC.toml)
- The relevant requirement files listed by the Spec
- The relevant acceptance-test files listed by the Spec
- [../product/CONTEXT.md](../product/CONTEXT.md)

Keep changes spec-first. When a human asks for a behavior or project-governance
change, update this harness before implementation code. Existing product
requirements and acceptance tests remain part of the project Spec through the
collections in [SPEC.toml](SPEC.toml).
