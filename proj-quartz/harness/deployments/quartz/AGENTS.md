# Quartz Deployment

This folder is the Deployment primitive for Quartz.

Before deploying Quartz or changing deployment knowledge, read:

- [DEPLOYMENT.toml](DEPLOYMENT.toml)
- [runbooks/quartz-ai-deploy.md](runbooks/quartz-ai-deploy.md)
- [checklists/quartz-deployment.toml](checklists/quartz-deployment.toml)
- The selected environment file in [environments/](environments/)
- The relevant resource change records in [resource-changes/](resource-changes/)
- The relevant resource snapshots in [resource-snapshots/](resource-snapshots/)

Every cloud resource used by Quartz must be approved one by one by a human.
Before creating, changing, scaling, deleting, or continuing to use a cloud
resource, verify that the corresponding resource change record includes human
approval and cites the specific approval time.

Resource change records must include enough provider pointers to manage the
resource later. For Google Cloud resources, keep the Google Cloud project,
region or location when applicable, provider resource URI or name, and console
URL when available. These pointers must be sufficient for a later operator or
agent to find the resource and change, delete, or scale it.

If approval evidence, approval time, or provider pointers are missing, consult
the human before taking deployment action.
