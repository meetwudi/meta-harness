# Task

A task is an outcome-oriented execution contract.

Tasks live in a Library. The Library points to the place that contains the task definition.

A task is selected by source Library and task identity. Paths are only implementation details discovered after resolving the Library.

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
- procedure items
- outcome items
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

1. Resolve the task's source Library through Library discovery.
2. Follow that Library's own discovery docs to the task representation.
3. Read the task-local instructions and task definition.
4. Verify the task definition's `source_library` matches the selected Library.
5. Resolve and read referenced Libraries.
6. Use configured Memory Libraries when present, including applicable
   `MEMORY.toml` instructions.
7. Complete procedure items and check outcomes.
8. Record completion evidence.
9. Promote durable learning to task memory when applicable.

A task is done when required procedure, outcomes, memory handling, and completion evidence are complete, blocked, or not applicable.
