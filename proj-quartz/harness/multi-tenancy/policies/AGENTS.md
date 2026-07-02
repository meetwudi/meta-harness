# Quartz Multi-Tenancy Policies

This folder is the pointable catalog for Quartz tenant security policies.

Policy records here are source knowledge for generated or handwritten
application guards, storage-driver checks, database-native policies, migration
verification, and tests.

Before adding or changing a policy, read:

- [../SPEC.toml](../SPEC.toml)
- [../COMPLIANCE.toml](../COMPLIANCE.toml)
- The requirement records cited by the policy

Keep each policy small and citable. Do not hide a security downgrade inside
policy prose; record missing enforcement layers explicitly in governed storage
or deployment knowledge.
