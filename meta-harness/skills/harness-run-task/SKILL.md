---
name: harness-run-task
description: Run a Meta Harness task in the current repository by composing Library resolution with the Task primitive. Use when the user asks to run, execute, continue, or complete a harness task; names a task; provides a library:// task reference; or asks Codex to produce Meta Harness task completion evidence.
---

# Harness: Run Task

Run a Meta Harness task in the current agent session.

1. Use `$harness-use-library` to resolve the task source Library and any `library://` references.
2. Read `meta-harness/setup/PRIMITIVE-ORIENTATION.md`.
3. Read `meta-harness/primitives/TASK.md`.
4. Select the task by Library and task identity, not by filesystem path.
5. Follow the selected Library's discovery docs to the task representation.
6. Execute the Task primitive's execution rules.
7. Finish with task name, source Library, Libraries used, checks run, completion evidence, and blockers.

If more than one Library contains a matching task, ask which Library or `library://` reference to use.
