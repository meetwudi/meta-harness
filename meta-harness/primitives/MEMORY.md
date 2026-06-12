# Memory Harness

A memory is a managed harness area for durable, evolving knowledge that accumulates over time, can be corrected, can be consolidated, and should influence future agent behavior.

Create a memory when a use case, workflow, source, process, product area, or agent behavior has repeated context, observations, corrections, or guidance that should improve future work.

Do not use memory as the canonical home for one-off requirements, final decisions, checklist gates, or product and engineering specs. Requirements, decisions, checklists, and product or engineering docs remain authoritative for their own purposes. If memory conflicts with one of those docs, agents should treat the canonical doc as authoritative and either record the conflict as a sourced memory entry or ask for human direction.

## Repo-Backed Project Memory

Repo-safe project memory should use this default shape:

```text
harness/memory/{memory-name}/
  AGENTS.md
  entries.md or entries.jsonl
  summary.md
```

`AGENTS.md` explains how to navigate and update that memory. `entries.md` or `entries.jsonl` is sequential memory: observations, corrections, events, or other sourced updates over time. `summary.md` is consolidated memory: the current summary, state, and behavior guidance. Keep behavior guidance in `summary.md` unless a separate file becomes necessary.

Agents should read a memory's `AGENTS.md` first, then `summary.md`, then relevant recent entries. Agents should update memory by appending sourced observations, corrections, or events to sequential memory, then updating `summary.md` when the consolidated state changes. Preserve provenance where relevant, and distinguish observed fact, human correction, and derived summary.

## Private Or External Memory

If a memory contains personal, sensitive, user-specific, or otherwise non-repo-safe content, the repo must not store the contents. It may store a descriptor instead:

```text
harness/memory/{memory-name}/
  AGENTS.md
  MEMORY.md
```

`MEMORY.md` should point to a logical memory reference such as `memory://private/{memory-name}` or `memory://external/{memory-name}` and explain what kind of memory is expected without exposing its contents.

## Logical References

`memory://` is a logical reference scheme, not a filesystem path. A storage adapter or documented project convention resolves `memory://` references.

Standard forms are:

- `memory://project/{memory-name}`
- `memory://project/{memory-name}/entries`
- `memory://project/{memory-name}/summary`
- `memory://external/{memory-name}`
- `memory://private/{memory-name}`

The first repo-backed convention maps `memory://project/{memory-name}` to `harness/memory/{memory-name}/`. Future adapters may resolve `memory://` to a database, virtual filesystem, cloud store, encrypted local store, or another backing store.

Agents should use logical memory references in specs when the storage location may change.
