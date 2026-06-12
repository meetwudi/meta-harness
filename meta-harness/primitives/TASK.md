# Task

A task is an outcome-oriented execution contract.

Tasks live in a Library. Repo tasks use:

```text
library://repo/tasks/{task-name}
```

## Shape

Project-specific tasks belong under `harness/tasks/`:

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
- URI
- purpose
- libraries to read
- memory paths to read, create, or update
- procedure checklist
- outcome checklist
- completion evidence

## Execution

A task execution should:

1. Read the task `AGENTS.md`.
2. Read `TASK.toml`.
3. Read referenced Libraries and compliance.
4. Create per-execution memory when the task defines it.
5. Complete procedure items.
6. Check outcomes.
7. Record completion evidence.
8. Promote durable learning to task memory when applicable.

A task is done when required procedure, outcomes, memory handling, and completion evidence are complete, blocked, or not applicable.
