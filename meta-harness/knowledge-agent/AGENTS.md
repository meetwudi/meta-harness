# Knowledge Agent

This folder specifies the Meta Harness knowledge agent.

Work here is spec-driven. Update [SPEC.toml](SPEC.toml) and human-listed
requirements before implementation code whenever behavior, interfaces, provider
choices, prompts, or runtime rules change. Update acceptance tests only when the
acceptance-test change is human-requested, human-approved, or already sourced.

Start with [SPEC.toml](SPEC.toml), then read the referenced requirement and
acceptance-test collections.

Implementation for this Spec lives under [impl/](impl/), relative to
`SPEC.toml`.
