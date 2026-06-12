# Task

A task is an outcome-oriented execution contract.

Tasks live in a Library. The Library points to the place that contains the task definition.

## Shape

Project-specific tasks use this shape:

```text
harness/tasks/
  AGENTS.md
  {task-name}/
    AGENTS.md
    TASK.toml
```

`TASK.toml` defines the task.

## Definition

`TASK.toml` includes:

- name
- source Library reference
- purpose
- Library references to read
- procedure checklist
- outcome checklist
- completion evidence

Use `library://{library-name}` references, not paths:

```text
library://project-harness
library://meta-harness
library://task-memory
```

Memory fields may point inside a Memory Library:

```toml
per_execution_memory_library = "library://task-memory/{task-name}/executions/"
cross_execution_memory_library = "library://task-memory/{task-name}/common/"
```

## Execution

A task execution:

1. Read the task `AGENTS.md`.
2. Read `TASK.toml`.
3. Read referenced Libraries.
4. Use configured Memory Libraries when present.
5. Complete procedure items and check outcomes.
6. Record completion evidence.
7. Promote durable learning to task memory when applicable.

A task is done when required procedure, outcomes, memory handling, and completion evidence are complete, blocked, or not applicable.
