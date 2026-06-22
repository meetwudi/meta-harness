# Integration Test Guidelines

Prefer real Librarian surfaces over mocks. Do not mock storage for behavior
that depends on Library discovery, governance computation, or update
persistence.

Use the local filesystem storage backend pointed at a temporary folder. Seed
that folder with filesystem Libraries, run Librarian
operations against it, and verify the underlying files changed through the
storage backend. The test must not write into the repository, the user's home
directory, or long-lived local memory.

Each integration test should name the runtime tool context, the seed files, the
Librarian operations invoked, and the exact underlying file assertions.

When a test verifies agent behavior through Librarian tools, assert the recorded
tool call events from runtime observability. Do not rely on prompt instructions
that ask an agent to describe the calls it made.
