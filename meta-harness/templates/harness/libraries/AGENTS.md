# Library Discovery

This folder defines project Library discovery.

Agents should start here when a task references `library://...` or when a human asks where project knowledge lives.

Read [LIBRARIES.toml](LIBRARIES.toml) for checked-in Libraries.

If `LIBRARIES.local.toml` exists, read it after `LIBRARIES.toml`. It is for private, local, machine-specific, or otherwise uncommitted Libraries.

## Index Rules

Each Library points to a place. Explore that place using its own docs and files.

Local index entries must not weaken checked-in governance.
