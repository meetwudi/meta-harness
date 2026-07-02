# Quartz Multi-Tenancy Policy Catalog

This folder is the first-stop catalog for Quartz tenant security policy.

- [tenant-data-scope.toml](tenant-data-scope.toml): how durable data is scoped to organizations.
- [layered-security.toml](layered-security.toml): application, storage-driver, and database-native enforcement layers.
- [role-actor-authority.toml](role-actor-authority.toml): role-specific organization actor authority.
- [actor-exchange-policy.toml](actor-exchange-policy.toml): actor acquisition as the required authority expansion path.

Actor exchange records live in [../actor-exchange/](../actor-exchange/).
