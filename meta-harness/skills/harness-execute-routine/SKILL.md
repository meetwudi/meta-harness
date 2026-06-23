---
name: harness-execute-routine
description: Perform a Meta Harness Routine execution in the current repository by composing Library resolution with the Routine primitive. Use when the user asks to execute, continue, or complete a harness Routine; names a Routine; provides a library:// Routine reference; or asks Codex to produce Meta Harness Routine completion evidence.
---

# Harness: Execute Routine

Perform a Meta Harness Routine execution in the current agent session.

1. Use `$harness-use-library` to resolve the Routine source Library and any `library://` references.
2. Read `meta-harness/setup/PRIMITIVE-ORIENTATION.md`.
3. Read `meta-harness/primitives/ROUTINE.md`.
4. Select the Routine by Library and Routine identity, not by filesystem path.
5. Follow the selected Library's discovery docs to the Routine representation.
6. Follow the Routine primitive's execution rules.
7. Finish with Routine name, source Library, Libraries used, checks performed, completion evidence, and blockers.

If more than one Library contains a matching Routine, ask which Library or `library://` reference to use.
