# Goal

A Goal is an outcome-oriented primitive.

Goals live in a Library. The Library points to the place that contains the Goal
record and related evidence.

Auditable Goal evidence uses `library://...` resource URIs. Sandbox workspace
paths are staging locations, not durable Goal evidence. When an artifact starts
in a sandbox workspace, write it into a governed Library through Librarian before
recording it as Goal evidence or requesting audit.

A Goal can be created at any time. A Goal is not required as an initial input to
a Knowledge Agent conversation.

## Shape

A filesystem Library may use this shape:

```text
goals/
  {goal-name}/
    GOAL.toml
```

Other storage backends may use an equivalent record shape. Agents choose or
confirm the Goal location through Library, storage, and governance knowledge.

## Draft Definition

`GOAL.toml` marks a place as a Goal primitive.

Draft required fields:

- `name`
- `desired_outcome`
- `state`
- `source_library`

Draft supported fields:

- `summary`
- `created_at`
- `created_by_actor`
- `framework_refs`
- `timeline`
- `current_state`
- `evidence`
- `progress`
- `blockers`
- `clarifications`
- `audit_requests`
- `audits`

Example:

```toml
# This is a Harness primitive.
# See also: library://meta-harness

name = "example-goal"
source_library = "library://project-harness"
desired_outcome = "The desired outcome in human-readable form."
state = "unmet"
framework_refs = ["library://meta-harness/primitives/GOAL.md#smart"]

[current_state]
summary = "What is currently known about the Goal state."
updated_at = "2026-06-23T00:00:00Z"
updated_by_actor = "actor://knowledge-agent"

[[evidence]]
id = "evidence-1"
uri = "library://project-harness/path/to/evidence.md"
summary = "Why this evidence matters for the Goal."
recorded_at = "2026-06-23T00:00:00Z"
recorded_by_actor = "actor://knowledge-agent"

[[progress]]
id = "progress-1"
summary = "Progress grounded in the Goal record and Library evidence."
evidence_refs = ["evidence-1"]
recorded_at = "2026-06-23T00:00:00Z"
recorded_by_actor = "actor://knowledge-agent"

[[blockers]]
id = "blocker-1"
summary = "What prevents meaningful progress."
status = "open"
evidence_refs = []
recorded_at = "2026-06-23T00:00:00Z"
recorded_by_actor = "actor://knowledge-agent"

[[clarifications]]
id = "clarification-1"
question = "What should be clarified while setting this Goal?"
answer = ""
status = "open"
asked_at = "2026-06-23T00:00:00Z"
asked_by_actor = "actor://knowledge-agent"

[[audit_requests]]
id = "audit-request-1"
requested_by_actor = "actor://knowledge-agent"
summary = "Evidence appears ready for independent audit."
evidence_refs = ["evidence-1"]
status = "open"
requested_at = "2026-06-23T00:00:00Z"

[[audits]]
id = "audit-1"
audit_request_id = "audit-request-1"
auditor_actor = "actor://goal-auditor/project-harness/goals/example-goal"
signal = "unmet"
summary = "Auditor judgment grounded in the Goal record and evidence."
gaps = ["Evidence does not yet demonstrate the desired outcome."]
evidence_refs = ["evidence-1"]
recorded_at = "2026-06-23T00:00:00Z"
```

## State

Goal state must support querying met and unmet Goals.

Draft state values:

- `unmet`
- `met`
- `blocked`
- `needs-clarification`

The agent pursuing a Goal may update evidence, current state, progress,
blockers, and clarifications when Library governance allows it. The pursuing
agent does not declare the Goal met.

`met` is backed by an independent Goal Auditor signal.

## Goal Auditor

A Goal Auditor is an independent agent that evaluates whether a Goal is met.

The Goal Auditor uses its own actor identity. Draft actor form:

```text
actor://goal-auditor/{library-name}/goals/{goal-name}
```

The Goal Auditor uses the shared Knowledge Agent starter prompt rendered in Goal
Audit mode. The auditor reads the Goal record, relevant Library evidence, and
selected goal-setting framework knowledge. A Goal audit is usually requested
before the auditor completes it. The auditor then returns an audit signal:

- `met`
- `unmet`
- `needs-clarification`

The auditor should be unbiased, point out gaps when any exist, and return an
OK-to-close signal only when the evidence supports the desired outcome.

The auditor reads Goal evidence through Librarian. A raw filesystem path or
external URL is not auditable Goal evidence unless it has first been represented
as governed Library knowledge and referenced by `library://...`.

## Clarification

For the first Goal primitive version, clarification happens while setting the
Goal. Later versions may add clarification during ongoing pursuit.

Clarification records capture the question, answer if known, status, actor, and
time. Clarification records may reference framework knowledge such as SMART.

## Goal-Setting Frameworks

Goal-setting frameworks are Library knowledge. They are not hard-coded into the
Goal primitive.

### SMART

SMART is one optional framework for clarifying Goals:

- Specific
- Measurable
- Achievable
- Relevant
- Time-bounded

When SMART knowledge is selected, time-boundedness may be represented as
timeline knowledge in the Goal record.
