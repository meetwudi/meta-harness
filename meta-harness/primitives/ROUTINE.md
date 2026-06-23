# Routine

A Routine is reusable composable workflow knowledge.

Routines live in a Library. The Library points to the place that contains the
Routine definition.

A Routine is selected by source Library and Routine identity. Paths are only
implementation details discovered after resolving the Library.

## Shape

Project-specific Routines may use this shape:

```text
harness/routines/
  AGENTS.md
  {routine-name}/
    AGENTS.md
    ROUTINE.toml
```

`ROUTINE.toml` defines the Routine.

## Definition

`ROUTINE.toml` includes:

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
library://routine-memory
```

Memory fields may point inside a Memory Library:

```toml
per_execution_memory_library = "library://routine-memory/{routine-name}/executions/"
cross_execution_memory_library = "library://routine-memory/{routine-name}/common/"
```

## Routine Execution

A Routine execution:

1. Resolve the Routine's source Library through Library discovery.
2. Follow that Library's own discovery docs to the Routine representation.
3. Read the Routine-local instructions and Routine definition.
4. Verify the Routine definition's `source_library` matches the selected Library.
5. Resolve and read referenced Libraries.
6. Use configured Memory Libraries when present, including applicable
   `MEMORY.toml` instructions.
7. Complete procedure items and check outcomes.
8. Record completion evidence.
9. Promote durable learning to Routine memory when applicable.

A Routine execution is done when required procedure, outcomes, memory handling,
and completion evidence are complete, blocked, or not applicable.

## Goal Relationship

A Routine may fulfill a Goal. A Routine may create a Goal and then continue
pursuit of that Goal when the Routine knowledge calls for it. A Routine does
not require a Goal.

Routine-to-Goal associations are knowledge references, not ownership
requirements.
