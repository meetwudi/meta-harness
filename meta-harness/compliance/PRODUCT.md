> Compliance: This file contains human-approved repository rules. AI agents may not change compliance obligations in this file unless a human explicitly approves the change.

# Product Harness

Each project Library records product context in its governed project knowledge:
what the product is, who it is for, and what outcomes matter.

When a project uses a project-local Spec, product requirements live in that
Spec's declared requirement collections. When a project uses a `product/`
layout, product decisions are recorded sequentially in
`proj-*/product/decisions/`.

Early product thoughts should stay as close-paraphrased notes until a human asks
to turn them into requirements or the source material already contains
requirement-shaped structure.

Product requirements are recorded modularly and must trace to sourced material.
Acceptance scenarios are added, changed, or deleted only when the acceptance
change is human-requested, human-approved, or already sourced.
