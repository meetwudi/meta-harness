# Quartz Actor Exchange

This folder documents how Quartz actors acquire additional actor authority.

Read [../policies/actor-exchange-policy.toml](../policies/actor-exchange-policy.toml)
and the exchange record you are changing before implementing actor expansion.

Actor exchange has this shape:

```text
current actors + requested authority + governed context -> expanded actors or denial
```

Do not implement new actor acquisition by directly constructing role-specific
organization actor strings at arbitrary call sites. Add or update an exchange
record first.
