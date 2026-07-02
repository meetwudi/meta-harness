# ToolSpec Creation

ToolSpec creation is a knowledge-guided setup workflow for creating a usable
agent tool.

Use Librarian tools for Library discovery, reads, writes, and verification. Use
sandbox files only as temporary drafting space; durable ToolSpec knowledge and
implementation code belong in the target Library.

## Creation Fields

Gather these fields for a ToolSpec creation request:

- Target Library: the writable `library://...` Library that will own the tool.
- Tool name: the exact agent-facing tool name.
- Purpose: what the tool does and when an agent should use it.
- Input contract: the JSON input fields and validation expectations.
- Output contract: the JSON output or failure shape.
- Allowed actors: actor URI glob patterns allowed to invoke the tool.
- Test cases: expected inputs and expected outputs or expected failures.
- Implementation path: a relative path under the ToolSpec folder, usually
  `impl/{tool-name}.js`.
- Implementation module contract: for current Knowledge Agent ToolSpec runtime,
  `.js` implementations must be ES modules exporting `executeToolSpec`,
  `execute`, or a default function.

When the human asks to create a usable tool, create or pursue a Goal for that
work. The desired outcome should include ToolSpec knowledge, approved generated
implementation knowledge, test evidence, and successful invocation through the
generic ToolSpec runtime.

## Approval Gate

Do not generate or write implementation code as the first response to a broad
tool request.

First, draft or update the ToolSpec knowledge from the human request and
inspected Library knowledge. Present the proposed tool name, purpose, input,
output, allowed actors, implementation path, and test cases for confirmation.

Only write the generated implementation after the human explicitly approves the
ToolSpec and asks to update or generate the implementation. The approval may be
ordinary language, but it must clearly authorize implementation code.

If a discovered ToolSpec has no implementation file, fail clearly or ask for
approval to generate the ToolSpec-derived implementation. Do not use a runtime
fallback or hidden built-in.

## Creation Flow

1. Call `librarian_intro` and `librarian_list_libraries`.
2. Resolve the writable target Library and read its `LIBRARY.toml`.
3. Create or pursue a Goal for creating a usable tool when the request is for a
   new tool or for completing an incomplete ToolSpec.
4. Draft the ToolSpec folder shape and `TOOLSPEC.toml` content.
5. Ask the human to confirm the ToolSpec before generating implementation code.
6. After explicit approval, generate implementation code strictly from the
   ToolSpec knowledge and the ToolSpec implementation module contract.
7. Write `TOOLSPEC.toml`, implementation code, and ToolSpec tests through
   Librarian updates to the target Library.
8. Verify the Library resources through Librarian reads.
9. Run ToolSpec tests or record why they could not be run.
10. Invoke the tool only through the generic ToolSpec discovery, actor
    governance, and execution path.

## Library Shape

Use this shape unless the target Library defines a stricter layout:

```text
toolspecs/
  {tool-name}/
    TOOLSPEC.toml
    impl/
      {tool-name}.js
    tests/
      unit.test.toml
```

The implementation file is knowledge. It is stored with the ToolSpec, loaded
only after Library discovery and actor governance, and may be regenerated from
the ToolSpec after human approval.

Generated JavaScript implementation files for the current runtime should use
ES module exports, for example:

```js
// Generated file. Do not edit directly; update the ToolSpec first.
// Supports ToolSpec: example_tool

export function executeToolSpec(input, toolSpec) {
  return { ok: true };
}
```

Do not use CommonJS `module.exports`, `exports.*`, or `require()` in generated
ToolSpec implementation code for this runtime.

## Governance

Respect both Library update governance and ToolSpec invocation governance.

Library `update_actors` governs whether the agent may write the ToolSpec,
implementation, and tests. ToolSpec `allowed_actors` governs whether an agent
may invoke the generated tool after discovery.

Runtime code may provide generic discovery, validation, sandboxing, module
loading, execution, and test-running machinery. Concrete tool behavior belongs
in ToolSpec knowledge and the ToolSpec implementation stored under the owning
Library.
