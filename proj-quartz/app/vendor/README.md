# Vendored CopilotKit Packages

Harness-Requirement: proj-quartz.vendored-chat-surface

PROJ-Quartz vendors the CopilotKit packages used by the chat surface so the app
is not coupled to a live external CopilotKit package dependency.

- Captured on: 2026-06-27
- Source package family: `@copilotkit/*`
- Captured package versions:
  - `@copilotkit/a2ui-renderer@1.61.2`
  - `@copilotkit/core@1.61.2`
  - `@copilotkit/license-verifier@0.5.0`
  - `@copilotkit/react-core@1.61.2`
  - `@copilotkit/runtime-client-gql@1.61.2`
  - `@copilotkit/shared@1.61.2`
  - `@copilotkit/web-inspector@1.61.2`
- Upstream repository declared by the packages:
  `https://github.com/CopilotKit/CopilotKit.git`
- Capture source: local installed package artifacts under
  `proj-quartz/app/node_modules/@copilotkit`.

To update the vendored copy, replace the package folders here from an inspected
upstream package version, then update this provenance record and the local
`file:` dependencies in `package.json`.
