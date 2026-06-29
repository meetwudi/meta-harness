---
name: meta-harness
description: Use Meta Harness through the shared Knowledge Agent entrypoint. Use when the user asks about Meta Harness Libraries, library:// resources, Routines, Goals, Memory, Compliance, Specs, ToolSpecs, Tags, acceptance tests, Librarian behavior, Knowledge Agent behavior, or governed knowledge/tools in this repository.
---

# Meta Harness

Use this skill as the Codex-facing entrypoint for Meta Harness. It is a thin
loader for the same knowledge-forward model used by the Knowledge Agent.

## Start Here

1. Read `meta-harness/knowledge-agent/impl/prompts/knowledge-agent.md.mustache`.
2. Follow that prompt's intent in Codex form: use Meta Harness tools or
   Librarian interfaces when they are available, and use repository knowledge
   files only as the local fallback.
3. Read `meta-harness/setup/PRIMITIVE-ORIENTATION.md`,
   `meta-harness/primitives/LIBRARY.md`, and
   `meta-harness/storage/STORAGE.md` before resolving governed knowledge.
4. Follow the repository `AGENTS.md` chain and each selected Library's own
   governance before making changes.
5. Resolve `library://...` references by Library URI. If a supplied Library URI
   cannot be verified as an actual Library URI, fail clearly instead of
   guessing from a filesystem path.

## Primitive Routing

Load the relevant primitive before acting:

- Library work: `meta-harness/primitives/LIBRARY.md`
- Routine execution or handoff: `meta-harness/primitives/ROUTINE.md`
- Goal creation, updates, evidence, or audits: `meta-harness/primitives/GOAL.md`
- Memory: `meta-harness/primitives/MEMORY.md`
- Compliance obligations: `meta-harness/primitives/COMPLIANCE.md`
- Specs and acceptance criteria: `meta-harness/primitives/SPEC.md`
- ToolSpecs and governed agent tools: `meta-harness/primitives/TOOLSPEC.md`
- Tags, tag updates, or tag queries: `meta-harness/primitives/TAGS.md`

Use the Knowledge Agent prompt's actor model as the authority for claims about
Conversation mode, Goal Audit mode, and Routine mode. Do not claim an
independent Goal audit or Routine execution happened unless the corresponding
tool handoff or actor-tagged evidence actually exists.

## Tool Use

Prefer exposed Meta Harness tools for governed operations:

- Use Librarian tools for Library discovery, reads, writes, and tag operations.
- Use Goal tools for Goal lifecycle and audit requests.
- Use Routine handoff/tooling when a request should run as a Routine actor.

When a tool is not exposed in the current Codex surface, preserve the same
semantics with local repository files: verify the source Library, read the
primitive, respect governance, and record evidence in governed knowledge when
the operation needs to be auditable.
