# Quartz Resource Snapshots

Source: human request on 2026-07-01 for a local actual snapshot of cloud resources used by the service.

This folder holds Deployment primitive resource snapshot records. A production Quartz deployment cannot be called finished until the Google Cloud resource snapshot is captured from the real deployment source rather than inferred from repository files. Each cloud resource in a production snapshot should point to the resource change record that captures its human approval.

The current draft does not include an actual Google Cloud snapshot because the repository does not record the production Google Cloud project, region, application hosting target, database target, secret source, or production base URL. Consult the human before creating a production snapshot record.

Use `template.toml` for the first captured snapshot.
