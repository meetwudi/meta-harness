# Database-Backed Knowledge Storage Direction

Source: human request on 2026-06-25.

Direction:

- PROJ-Quartz should not rely on local filesystem Libraries for production
  project knowledge.
- PROJ-Quartz should move toward database-backed Library storage.
- The specific database has not been chosen yet.

Non-committed implementation recommendation:

- Preserve `library://...` as the application-facing contract.
- Add a database-backed Meta Harness storage driver behind Librarian instead of
  coupling the Quartz UI directly to one database schema.
