# Knowledge Agent

This folder specifies the Meta Harness knowledge agent.

Work here is spec-driven. Update [SPEC.toml](SPEC.toml) and human-listed
requirements before implementation code whenever behavior, interfaces, provider
choices, prompts, or runtime rules change. Update Acceptance scenarios only
when the acceptance change is human-requested, human-approved, or already
sourced.

Start with [SPEC.toml](SPEC.toml), then read the referenced requirement and
integration-test collections. For end-to-end acceptance scenarios, read
[acceptance/ACCEPTANCE.toml](acceptance/ACCEPTANCE.toml).

Implementation for this Spec lives under [impl/](impl/), relative to
`SPEC.toml`.
