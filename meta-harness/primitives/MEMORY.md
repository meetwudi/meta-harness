# Memory

Memory is agent-usable knowledge carried across time.

Memory is a primitive. A Library may contain Memory, point to it, or be primarily a Memory Library.

Task memory should normally live outside the repository unless a human explicitly asks otherwise.

## Purpose

Memory helps agents:

- carry useful learning across task executions
- avoid repeating known mistakes
- preserve decisions, context, and execution history
- improve future work without inventing new source material

## Organization

Memory may be organized as:

- sequential entries
- summaries
- task-specific memory
- execution-specific memory
- durable project context

The Memory Library and task choose the organization.

## Task Interaction

Every task execution should treat Memory as an available primitive.

A task may:

- read relevant memory before acting
- create execution memory
- update durable task memory
- summarize older memory
- mark memory unavailable when no suitable Memory Library exists

Tasks should not restate that Memory exists unless they have task-specific memory needs.

## Governance

Memory updates must preserve provenance and meaning.

Memory must not invent product content, compliance obligations, engineering practices, acceptance tests, or open questions.

Compliance changes still require explicit human approval, even when proposed or remembered through Memory.
