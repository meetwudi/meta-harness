# Initial Chat Application

Source: human request on 2026-06-25.

Decision:

- Create PROJ-Quartz as the top-level `library://proj-quartz` project Library.
- Start with a CopilotKit chat surface for talking to the Meta Harness Knowledge
  Agent.
- Keep the first version local and minimal, without adding customer records,
  self-learning flows, persistence products, early-access surfaces, or broader
  acquisition workflows.
- Put the application under `proj-quartz/app/` so the Meta Harness framework
  layer remains unchanged.
