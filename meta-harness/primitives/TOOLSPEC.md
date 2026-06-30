# ToolSpec

A ToolSpec is a modular tool definition for agent-usable capabilities.

ToolSpecs live in Libraries. `TOOLSPEC.toml` marks a folder as a ToolSpec
primitive and describes one agent-facing tool, including what it does, who may
invoke it, input and output schemas, implementation location, and test cases.

A ToolSpec is different from a Spec. A Spec maps requirements and acceptance
tests for a larger implementation surface. A ToolSpec defines one concrete tool
that can be discovered and exposed to agents when runtime governance allows it.

## Shape

```text
{toolspec-root}/
  TOOLSPEC.toml
  tests/
    unit.test.toml
  impl/
    ...
```

Each ToolSpec has its own folder. Generated implementation code for that tool
may be a single file. `TOOLSPEC.toml` references the generated implementation
file so tools remain knowledge-driven instead of hand-wired by hidden runtime
convention.

Generated implementation files should begin with:

- the generated-file notice
- the ToolSpec or requirement IDs the file supports, when applicable
- a short explanation of how the file supports those requirements

## Definition

`TOOLSPEC.toml` includes:

- `name`
- `description`
- `implementation`
- `allowed_actors`
- `[input_schema]`
- `[output_schema]`

`TOOLSPEC.toml` may also include:

- `order`
- `[[test_cases]]`

Example:

```toml
# This is a Harness primitive.
# See also: library://meta-harness

name = "normalize_text"
description = "Normalize text for downstream processing."
implementation = "impl/normalize-text.ts"
allowed_actors = ["actor://example/agent"]

[input_schema]
type = "object"
required = ["text"]
additional_properties = false
properties_json = "{\"text\":{\"type\":\"string\"}}"

[output_schema]
type = "object"
description = "Normalized text and processing metadata."

[[test_cases]]
id = "normalizes-text"
input_json = "{\"text\":\" Example  text \"}"
expected = "Returns normalized text with provenance."
```

## Fields

`name` is the exact agent-facing tool name.

`description` explains what the tool is for. Tool descriptions are part of the
agent interface, so they should be concise and action-oriented.

`implementation` is a path relative to the ToolSpec folder unless the owning
Library defines another resolution rule. It points to the generated code file
that implements the tool. A runtime may also document supported implementation
tokens when the generated implementation is provided by that runtime.

`allowed_actors` is a list of actor URI glob patterns. Runtime tool exposure
and invocation must evaluate the active actor identities against this list.

`input_schema` describes the JSON input accepted by the tool. For the current
local TOML subset, `properties_json` carries the JSON Schema `properties`
object as JSON text.

`output_schema` describes the output shape or output contract.

`test_cases` describe expected tool behavior with input and expected output or
expected failure. ToolSpec test cases are sourced knowledge for executable
tests; generated test code may use them directly or cite them.

## Runtime-Supported Implementations

Runtimes may document supported implementation references as governed
knowledge. Shared ToolSpec guidance should describe the resolution contract,
not embed concrete tool recipes. Concrete tool names, schemas, implementation
tokens, and usage instructions belong in ToolSpec knowledge, project knowledge,
or runtime capability knowledge inspected through Libraries.

## Governance

Tools are discovered from governed Libraries. A runtime must not execute a
ToolSpec merely because a file exists. It must verify the selected ToolSpec,
enforce `allowed_actors`, and execute only the referenced implementation under
the runtime's supported tool adapter.

If a ToolSpec cannot be resolved, validated, or invoked under actor governance,
the runtime must fail clearly instead of using an ungoverned fallback.
