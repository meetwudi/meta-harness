# Library Creation

Library creation is a knowledge-guided workflow.

Librarian tools provide the mechanics for reading storage knowledge and creating
Libraries. This protocol carries the creation practice agents follow before
calling creation tools.

## Creation Fields

Gather these fields for a Library creation request:

- Library name: the stable name used in `library://{name}`.
- Library description: the purpose of the Library and the knowledge it should
  hold.
- Storage location: the named place where the Library will live.
- Governance intent: any human-provided read or update access expectation that
  should shape the created `LIBRARY.toml`.

## Storage Location Selection

Read storage guidance from `library://meta-harness/storage/STORAGE.md`, then
read `library://meta-harness/storage/knowledge-agent-local-storage-locations.toml`.
Use the storage location names, descriptions, drivers, and capabilities from
that knowledge.

Present writable storage locations to the human, including each location name
and purpose.

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

When the request describes the desired Library but gives no name, ask for the
name.

When the request gives a name but no purpose, ask for the Library description.

Descriptions should help future humans and agents choose the Library from a
list. Prefer a concise statement of what the Library holds and when to use it.

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
2. Present writable storage locations and recommend a default.
3. Gather missing creation fields from the human.
4. Call `librarian_create_library` with the storage location name, Library
   name, and description.
5. Verify the created Library through `librarian_list_libraries`.
6. Refer to the new Library by its `library://` URI.

After creation, use Librarian read and update tools for Library contents.
