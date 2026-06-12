# Harness File Metadata

Markdown files may begin with YAML front matter that records harness metadata for the file.

## Format

```yaml
---
harness_file:
  change: explicit_human_request
---
```

## Fields

`harness_file.change` defines when an AI agent may change the file.

Allowed values:

- `explicit_human_request`: AI agents may change the file only when a human explicitly asks to change that file.

Files without `harness_file` metadata follow the repository's ordinary harness rules.

## Validation

Use [tools/check-harness-file-metadata](tools/check-harness-file-metadata) to validate Markdown front matter that includes `harness_file`.
