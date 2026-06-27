// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.shamanistic-library-tools: describes Librarian tools exposed to agents.
// Supports librarian.tool-comments: gives each tool a concise description.
// Supports librarian.tool-descriptor-registry: lists the agent-facing Librarian tool registry.
// Supports librarian.tool-librarian-add-tags: describes the add Tags tool.
// Supports librarian.tool-librarian-remove-tags: describes the remove Tags tool.
// Supports librarian.tool-librarian-query-by-tags: describes the query by Tags tool.
// Supports librarian.tool-librarian-delete: describes the file/folder delete tool.

import type { LibrarianToolDescriptor } from "./types.js";
import { LIBRARY_NAME_PATTERN } from "./library-name.js";

/**
 * Returns the Librarian tool descriptors exposed to an agent.
 */
export function librarianToolDescriptors(): LibrarianToolDescriptor[] {
  return [
    {
      name: "librarian_intro",
      description: "Call this first before any other Librarian tool. Returns primitive onboarding content using the search result shape.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
    {
      name: "librarian_list_libraries",
      description: "Call this immediately after librarian_intro to list storage-discovered Libraries with access and system metadata.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
    {
      name: "librarian_read",
      description: "Read a file from a readable Library by resource URI.",
      parameters: {
        type: "object",
        properties: {
          uri: { type: "string" },
        },
        required: ["uri"],
        additionalProperties: false,
      },
    },
    {
      name: "librarian_list_files",
      description: "List file resource URIs under a readable Library URI or Library folder URI, optionally recursively.",
      parameters: {
        type: "object",
        properties: {
          uri: { type: "string" },
          recursive: { type: "boolean" },
        },
        required: ["uri"],
        additionalProperties: false,
      },
    },
    {
      name: "librarian_search",
      description: "Search readable Library files by Library URI patterns and query, returning resource URI and content snippets grouped by Library.",
      parameters: {
        type: "object",
        properties: {
          libraryUriPatterns: {
            type: "array",
            items: { type: "string" },
          },
          query: { type: "string" },
          limit: { type: "number" },
        },
        required: ["libraryUriPatterns", "query"],
        additionalProperties: false,
      },
    },
    {
      name: "librarian_update",
      description: "Write a file into a writable Library by resource URI.",
      parameters: {
        type: "object",
        properties: {
          uri: { type: "string" },
          content: { type: "string" },
        },
        required: ["uri", "content"],
        additionalProperties: false,
      },
    },
    {
      name: "librarian_create_library",
      description:
        "Create a Library in a named storage location, or in the configured default creation location when storageLocationName is omitted. Library names use lowercase letters and digits separated by hyphens or underscores. Description is required.",
      parameters: {
        type: "object",
        properties: {
          storageLocationName: { type: "string" },
          name: { type: "string", pattern: LIBRARY_NAME_PATTERN },
          description: { type: "string" },
        },
        required: ["name", "description"],
        additionalProperties: false,
      },
    },
    {
      name: "librarian_delete",
      description:
        "Delete a file or folder resource inside a writable Library. Exact Library roots must use librarian_delete_library.",
      parameters: {
        type: "object",
        properties: {
          uri: { type: "string", pattern: "^library://" },
        },
        required: ["uri"],
        additionalProperties: false,
      },
    },
    {
      name: "librarian_delete_library",
      description:
        "Delete an exact Library URI when the active actor can update the Library and the storage location grants delete capability.",
      parameters: {
        type: "object",
        properties: {
          uri: { type: "string", pattern: "^library://" },
        },
        required: ["uri"],
        additionalProperties: false,
      },
    },
    {
      name: "librarian_add_tags",
      description: "Add tag values to the TAGS.toml record for a writable Library knowledge scope.",
      parameters: {
        type: "object",
        properties: {
          scopeUri: { type: "string", pattern: "^library://" },
          tags: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["scopeUri", "tags"],
        additionalProperties: false,
      },
    },
    {
      name: "librarian_remove_tags",
      description: "Remove tag values from the TAGS.toml record for a writable Library knowledge scope.",
      parameters: {
        type: "object",
        properties: {
          scopeUri: { type: "string", pattern: "^library://" },
          tags: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["scopeUri", "tags"],
        additionalProperties: false,
      },
    },
    {
      name: "librarian_query_by_tags",
      description: "Query readable Library knowledge scopes by structured tag filters from TAGS.toml records. Searches all readable Libraries unless exact libraryUris or wildcard libraryUriPatterns filters are supplied.",
      parameters: {
        type: "object",
        properties: {
          libraryUris: {
            type: "array",
            items: { type: "string" },
          },
          libraryUriPatterns: {
            type: "array",
            items: { type: "string" },
          },
          tags: {
            type: "array",
            items: { type: "string" },
          },
          match: { type: "string", enum: ["all", "any"] },
          limit: { type: "number" },
        },
        required: ["tags"],
        additionalProperties: false,
      },
    },
  ];
}
