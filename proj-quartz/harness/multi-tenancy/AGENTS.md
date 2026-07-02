# Quartz Multi-Tenancy Harness

This folder is the Quartz multi-tenancy Spec.

Before changing tenant boundaries, organization context behavior, conversation
ownership, API-key ownership, or low-level authorization for tenant-scoped
resources, read:

- [SPEC.toml](SPEC.toml)
- The relevant requirement files listed by the Spec
- [COMPLIANCE.toml](COMPLIANCE.toml)
- [policies/](policies/)
- [actor-exchange/](actor-exchange/)

In this Spec, each Quartz organization is a tenant. Implementation code may use
the user-facing word organization, but tenant boundary means organization
boundary.

Keep changes spec-first. When a human states a requirement, transcribe it here
before implementation code. Do not invent, split, merge, or elaborate
requirements beyond the human-stated meaning.

Security policy records in this folder are implementation source knowledge.
Application guards, storage-driver guards, database-native policies, generated
artifacts, and tests should cite the relevant requirement or policy record.
