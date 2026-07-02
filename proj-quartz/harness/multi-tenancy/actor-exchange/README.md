# Quartz Actor Exchange

Actor exchange is the governed path for expanding Quartz actor authority.

First-version exchanges:

- [exchanges/user-to-organization-member.toml](exchanges/user-to-organization-member.toml)
- [exchanges/user-to-organization-admin.toml](exchanges/user-to-organization-admin.toml)
- [exchanges/api-key-to-tenant-actors.toml](exchanges/api-key-to-tenant-actors.toml)
- [exchanges/organization-api-key-to-service-account.toml](exchanges/organization-api-key-to-service-account.toml)

Inputs are the current actor set, requested authority, and governed context such
as signed-in session, organization profile, role, or API-key record. Output is
an expanded actor set or denial.
