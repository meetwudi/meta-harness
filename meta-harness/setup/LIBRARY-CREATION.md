# Library Creation

Library creation is a knowledge-guided setup workflow.

Librarian tools provide the mechanics for reading storage knowledge and creating
Libraries. This protocol carries the creation practice agents follow before
calling creation tools.

## Creation Fields

Gather these fields for a Library creation request:

- Library name: the stable name used in `library://{name}`. Use lowercase
  letters and digits separated by hyphens or underscores, such as
  `example-library`.
- Library description: the purpose of the Library and the knowledge it should
  hold.
- Storage location: the named place where the Library will live.
- Governance intent: any human-provided or project-configured read or update
  access expectation that should shape the created `LIBRARY.toml`.

## Storage Location Selection

Read storage guidance from `library://meta-harness/storage/STORAGE.md`, then
read `library://repository/.meta-harness.json`.
Use the storage location names, descriptions, drivers, and capabilities from
that knowledge.

If the selected project marker contains `libraryCreation.policyUri`, read that
Library creation policy before asking creation questions.

Present writable storage locations to the human, including each location name
and purpose.

When the selected project knowledge designates exactly one default Library
creation location and says not to ask, use that default without asking the human
to choose a storage location. Do not expose the internal storage location in the
user-facing response unless the human asks for internal details.

Recommend a default storage location based on the human's request, the location
descriptions, and writable capability. Ask the human to confirm the recommended
default or choose another storage location by name.

When the human names a storage location or clearly describes one available
location, present that location as the recommended target.

When several available locations fit, recommend the strongest match and include
the other choices.

When the request provides a Library name and purpose but leaves storage location
open, present the available writable storage locations, recommend a default
target, and ask for confirmation.

## Library Details

When the request gives the Library name, use that name after validating it with
the creation tool.

When the requested name is not in the canonical format, ask the human to
confirm a canonical replacement before creating the Library.

When the request describes the desired Library but gives no name, ask for the
name.

When the request gives a name but no purpose, ask for the Library description.
Do not create a Library with an empty, inferred, placeholder, or generic
description.

Descriptions should help future humans and agents choose the Library from a
list. Prefer a concise statement of what the Library holds and when to use it.

When the human describes a durable remembering or observation workflow in
ordinary language, translate that into Library and Memory primitives. For
example, a request to remember customer notes by customer name can become a
customer Memory Library with collection guidance for per-customer folders. Ask
only for unresolved human-facing placeholders such as name or description; do
not ask the human to write TOML.

When the request asks for automatic capture, passive observation, remembering
future conversations, or organization of future facts, create or update the
Library's `MEMORY.toml` as part of the setup. A README or prose note may
explain the Library for humans, but it does not make the Library a Memory
primitive and is not sufficient for automatic curation.

Write `MEMORY.toml` with:

- instructions that say what user-stated information belongs in this Memory
  collection
- `[curation] auto_curated = true` unless the human asks not to curate
  automatically
- `[[collections]]` entries when the human describes natural buckets such as
  customer names, organization names, domain identifiers, projects, or topics

Each `MEMORY.toml` must follow the Memory primitive shape. Include a top-level
`instructions` array. For each `[[collections]]` entry, include `name`,
`location`, and `instructions`; do not use prose-only comments or a
`description` field as a substitute for those required collection fields.

Use `MEMORY.toml` to define the concrete memory layout. If the human says each
thing should have its own folder, put that folder pattern in a collection
`location`. If the human says memory should be sequential, specify the sequence
rule in collection instructions, such as daily files, append-only dated entries,
learned-at timestamps, learned-from source, and the exact user-stated content.

Keep Memory instructions domain-shaped but not code-shaped. Translate the
human's ordinary language into the primitive; do not ask the human to provide
field names, TOML, file paths, or implementation details.

## Library URI Operations

Treat `library://...` references as Library resource URIs.

Use Librarian tools to read, search, update, and create Library resources by
URI. Use sandbox workspace file paths for files that the sandbox has staged as
workspace files.

When a human asks to change Library knowledge, resolve the target Library and
check its governance through Librarian results. For writable Libraries, use the
Librarian update tool with the target `library://...` URI. For read-only
Libraries, prepare the proposed wording for human review.

## Creation Flow

1. Read storage guidance and storage location definitions through
   `librarian_read`.
2. Resolve storage location from project policy when available; otherwise
   present writable storage locations and recommend a default.
3. Gather missing creation fields from the human.
4. Call `librarian_create_library` with the Library name, description, and
   storage location name when project policy has not already resolved it.
5. Verify the created Library through `librarian_list_libraries`.
6. Refer to the new Library by its `library://` URI.

After creation, use Librarian read and update tools for Library contents.
