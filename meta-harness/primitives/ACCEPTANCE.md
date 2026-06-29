# Acceptance

Acceptance is a knowledge primitive for end-to-end acceptance testing
scenarios.

Acceptance suites live in Libraries. `ACCEPTANCE.toml` marks a folder as an
Acceptance primitive and defines one or more acceptance tests that can be run by
humans, AI agents, browser automation, command runners, or other executable
test harnesses.

Acceptance is separate from Spec. A Spec maps sourced requirements and
implementation-facing integration tests. Acceptance describes user-visible or
operator-visible scenarios that should pass for a scoped area of knowledge or
implementation, including the circumstances required to replay those scenarios.

## Shape

```text
{acceptance-root}/
  AGENTS.md
  ACCEPTANCE.toml
```

An Acceptance primitive may be colocated with a Spec or implementation folder,
but it is not owned by `SPEC.toml` and is not a Spec collection.

## Definition

`ACCEPTANCE.toml` includes:

- `name`
- `version`
- `source`
- `scope`
- `trigger`
- `[[tests]]`

Each test includes:

- `id`
- `title`
- `requirements`
- `circumstances`
- `procedure`
- `expected`

Optional test fields:

- `execution`
- `commands`
- `evidence`

Example:

```toml
name = "proj-quartz-acceptance"
version = "v0.0.0"
source = "Human request captured on 2026-06-28."
scope = [
  "proj-quartz/**",
]
trigger = "Run these acceptance tests when files in scope change or when a human asks to run acceptance for this suite."

[[tests]]
id = "proj-quartz.acceptance.example"
title = "Example acceptance scenario"
requirements = [
  "proj-quartz.example-requirement",
]
circumstances = [
  "Quartz dev server is running.",
]
execution = "ai-browser"
procedure = [
  "Open the app.",
  "Perform the scenario.",
]
expected = [
  "The scenario succeeds.",
]
```

## Scope And Trigger

`scope` is a list of repository-relative globs or Library resource URI patterns
that define the files, folders, or governed resources covered by the Acceptance
primitive.

`trigger` is human-readable policy. It should state when the suite should be
run, such as after changes under the scoped folder or when a release candidate
is prepared.

Acceptance trigger policy is not Compliance. It does not create a compliance
obligation by itself. It is still a governed knowledge signal that agents can
use when deciding which end-to-end scenarios should be run before claiming a
change is accepted.

## Tests

Acceptance tests should capture the circumstances that matter for faithful
replay. Use `circumstances` for environment setup, required services, actor
identity, browser state, real collaborator expectations, seeded data, or known
cleanup requirements.

`procedure` is the scenario to run.

`expected` is the expected acceptance behavior.

`execution` describes how the scenario is run. Suggested values:

- `human`: a human runs or reviews the scenario.
- `ai`: an AI agent runs the scenario using available tools.
- `ai-browser`: an AI agent runs the scenario through a browser.
- `command`: a command or script is the primary runner.
- `hybrid`: multiple runners or manual evidence are required.

`commands` may list runnable commands for command-backed acceptance tests.

`evidence` may list evidence to collect during a run, such as screenshots,
Library resource contents, trace records, command output, or API responses.

Do not record run outcomes in `ACCEPTANCE.toml`. Outcomes belong in run logs,
Goal evidence, CI artifacts, or another evidence record created for a specific
execution.

## Governance

Acceptance suites are source-governed. AI agents must not create, infer, split,
merge, elaborate, add, change, or delete acceptance tests unless a human
explicitly requests or approves that acceptance change, or the acceptance
content is already present in sourced material.

When permitted, transcribe acceptance tests while preserving the human- or
source-stated circumstances, procedure, and expected behavior.
