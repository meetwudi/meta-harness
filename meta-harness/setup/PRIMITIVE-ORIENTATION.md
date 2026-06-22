# Primitive Orientation

Read this before working in a Meta Harness-managed project.

Meta Harness is knowledge-first. AI is the runtime that reads, follows, and updates knowledge under human rules.

Libraries are where knowledge lives. A Library points to a place. The agent explores that place through its own files, tools, and instructions.

Some knowledge is a primitive:

- Library: a governed place to explore.
- Task: a countable unit of execution with required outcomes.
- Memory: agent-usable knowledge carried across time.
- Compliance: human-approved obligations and explicit checks used to govern and verify work.
- Spec: a modular requirement map with separate acceptance tests.

The primitives compose:

- Tasks read Libraries.
- Tasks may update Libraries when allowed.
- When a filesystem Library contains `LIBRARY.toml`, that file describes which
  actor URI patterns may read or update it.
- Tasks use Memory without needing every task to restate that Memory exists.
- When Memory contains `MEMORY.toml`, that file describes how the memory is
  organized and what agents may update.
- The default local task Memory Library is `library://task-memory` when registered.
- Tasks use Compliance to make procedure and outcomes verifiable.
- Specs connect sourced requirements, acceptance tests, and implementation
  citations.
- Libraries organize all primitives.
- Library creation follows `library://meta-harness/primitives/LIBRARY-CREATION.md`.
- Storage locations follow `library://meta-harness/storage/STORAGE.md`.
- `library://...` references are Library resource URIs handled through
  Librarian tools.

Primitive TOML files for the five current primitives identify themselves with a
short comment header:

```toml
# This is a Harness primitive.
# See also: library://meta-harness
```

For `COMPLIANCE.toml`, the `# Harness-Compliance:` review notice remains the
first content line; the primitive header follows that notice.

Requirement files and acceptance-test files are structured harness files, but
they are not primitives.

When starting work, first discover the relevant Libraries, then identify applicable tasks, memory, and compliance.
