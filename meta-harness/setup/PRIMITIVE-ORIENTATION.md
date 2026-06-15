# Primitive Orientation

Read this before working in a Meta Harness-managed project.

Meta Harness is knowledge-first. AI is the runtime that reads, follows, and updates knowledge under human rules.

Libraries are where knowledge lives. A Library points to a place. The agent explores that place through its own files, tools, and instructions.

Some knowledge is a primitive:

- Library: a governed place to explore.
- Task: a countable unit of execution with required outcomes.
- Memory: agent-usable knowledge carried across time.
- Compliance: human-approved obligations and explicit checks used to govern and verify work.

The primitives compose:

- Tasks read Libraries.
- Tasks may update Libraries when allowed.
- When a filesystem Library contains `LIBRARY.toml`, that file describes which
  task URI patterns may read or update it.
- Tasks use Memory without needing every task to restate that Memory exists.
- When Memory contains `MEMORY.toml`, that file describes how the memory is
  organized and what agents may update.
- The default local task Memory Library is `library://task-memory` when registered.
- Tasks use Compliance to make procedure and outcomes verifiable.
- Libraries organize all primitives.

When starting work, first discover the relevant Libraries, then identify applicable tasks, memory, and compliance.
