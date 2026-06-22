// Generated file. Do not edit directly; update the Spec first.
// Supports librarian.shamanistic-library-tools: describes Librarian tools exposed to agents.
// Supports librarian.tool-comments: gives each tool a concise description.

import type { LibrarianToolDescriptor } from "./types.js";

/**
 * Returns the Librarian tool descriptors exposed to an agent.
 */
export function librarianToolDescriptors(): LibrarianToolDescriptor[] {
  return [
    {
      name: "librarian_intro",
      description: "Start here. Returns primitive onboarding content using the search result shape.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
    {
      name: "librarian_list_libraries",
      description: "List storage-discovered Libraries with readable and writable access.",
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
      description: "Create a Library in a named storage location.",
      parameters: {
        type: "object",
        properties: {
          storageLocationName: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
        },
        required: ["storageLocationName", "name"],
        additionalProperties: false,
      },
    },
  ];
}
