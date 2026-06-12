# Harness Design

## Principles

Meta Harness defines how a managed project uses spec-as-code harness docs.

A managed project is a repository that carries `.meta-harness.json` and follows this design.

Development principles are defined in [DEVELOPMENT-PRINCIPLES.md](DEVELOPMENT-PRINCIPLES.md).

Meta Harness is self-managed: this repository uses the same marker and management layer that it provides to managed projects.

`meta-harness/` is the copied management layer. Managed projects must not modify files under `meta-harness/` directly; that layer should change only when updating from the Meta Harness source.

`harness/` is the project-specific harness layer. Project-specific rules, specs, workflows, and docs belong under `harness/`.

Harness docs use progressive disclosure through `AGENTS.md` files. A harness doc should be reachable from the root by following the `AGENTS.md` chain.

The root `AGENTS.md` is protected: AI agents may change it only when a human explicitly asks to change `AGENTS.md`.

## Managed Project Shape

```text
.meta-harness.json
AGENTS.md
meta-harness/
  AGENTS.md
  HARNESS-DESIGN.md
  DEVELOPMENT-PRINCIPLES.md
  AI-POLICY.md
  templates/
  tools/
  github/
    workflows/
harness/
  AGENTS.md
  CHECKLIST.md
  product/
    AGENTS.md
    CONTEXT.md
    decisions/
    requirements/
  engineering/
    AGENTS.md
```

`.meta-harness.json` records the Meta Harness source.

To understand management-layer changes, managed projects compare source refs directly with `git diff` in the Meta Harness source repository:

```text
git diff <old-source-ref>..<new-source-ref> -- meta-harness/
```

Managed projects should use that diff as the change record instead of relying on an in-tree changelog.

`meta-harness/AGENTS.md` indexes Meta Harness docs. `harness/AGENTS.md` indexes project-specific harness docs.

Managed projects should place their own harness content under `harness/`, not by editing the copied `meta-harness/` management layer.

## Product Harness

Each managed project records product context in `harness/product/CONTEXT.md`: what the product is, who it is for, and what outcomes matter.

Product decisions are recorded sequentially in `harness/product/decisions/`. Use this for decision history.

Early product thoughts should stay as close-paraphrased notes until a human asks to turn them into requirements or the source material already contains requirement-shaped structure.

Product requirements are recorded modularly in `harness/product/requirements/`. Each requirement must trace to sourced material and include sourced acceptance tests that can actually be tested, or explicitly mark acceptance tests as an unknown source gap.

## AI Policy

AI behavior policy is defined in [AI-POLICY.md](AI-POLICY.md).

Managed projects should operationalize that policy for PR review with `harness/CHECKLIST.md` or a more specific descendant checklist. They may copy the template from `meta-harness/templates/harness/CHECKLIST.md`.

## Engineering Practices

Project-specific engineering practices belong under `harness/engineering/` in the managed project.

Meta Harness does not impose default engineering practices.

## Checklist Attestation

Any folder may define `CHECKLIST.md`.

For each PR, changed files must be checked against every `CHECKLIST.md` in their directory ancestry.

AI agents must read each applicable checklist, complete every relevant item, and leave a parseable commit-message attestation:

```text
Meta-Harness-Checklist: path=<path-to-CHECKLIST.md>; status=<status>
```

`<status>` is `pass`, `blocked`, or `na`. Use one attestation line per applicable checklist.

PR enforcement belongs to Meta Harness. Managed projects should install the GitHub workflow template from `meta-harness/github/workflows/`; local hooks may mirror it but are not authoritative.
