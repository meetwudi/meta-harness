# Quartz Migration Scripts

Scripts in this folder are migration artifacts, not one-off operational scraps.

Before adding or changing a migration script:

- Link it from a `proj-quartz/harness/migration-intents/*.toml` record through
  `implementation_artifacts`.
- Cite that migration intent in the script with
  `Harness-Migration-Intent: <migration-intent-id>`.
- Keep the script idempotent or provide an explicit `--dry-run` mode when it
  mutates durable data.
- Fail clearly when required configuration, actor context, or target state is
  missing.
