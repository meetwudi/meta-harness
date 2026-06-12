# Task

A task is an outcome-oriented execution contract.

Tasks live in a Library. The Library points to the place that contains the task definition.

Tasks use checklists to make procedure and outcomes verifiable.

## Shape

Project-specific tasks commonly use this shape:

```text
harness/tasks/
  AGENTS.md
  {task-name}/
    AGENTS.md
    TASK.toml
```

`TASK.toml` is the task definition.

## Definition

`TASK.toml` should include:

- name
- source Library
- purpose
- Libraries to read
- procedure checklist
- outcome checklist
- completion evidence

Reference Libraries by name:

```text
library://project-harness
library://meta-harness
library://task-memory
```

Do not enumerate paths inside the Library reference.

Memory fields may point to task-specific places inside a Memory Library:

```toml
per_execution_memory_library = "library://task-memory/{task-name}/executions/"
cross_execution_memory_library = "library://task-memory/{task-name}/common/"
```

## Execution

A task execution should:

1. Read the task `AGENTS.md`.
2. Read `TASK.toml`.
3. Read referenced Libraries.
4. Use configured Memory Libraries when present.
5. Complete procedure items.
6. Check outcomes.
7. Record completion evidence.
8. Promote durable learning to task memory when applicable.

A task is done when required procedure, outcomes, memory handling, and completion evidence are complete, blocked, or not applicable.
