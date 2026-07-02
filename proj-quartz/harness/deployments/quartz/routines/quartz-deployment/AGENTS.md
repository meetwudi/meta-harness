# Quartz Deployment Routine

Read [ROUTINE.toml](ROUTINE.toml), then the parent Deployment primitive files:

- [../../DEPLOYMENT.toml](../../DEPLOYMENT.toml)
- [../../COMPLIANCE.toml](../../COMPLIANCE.toml)
- [../../runbooks/quartz-ai-deploy.md](../../runbooks/quartz-ai-deploy.md)
- [../../checklists/quartz-deployment.toml](../../checklists/quartz-deployment.toml)

Do not run database migrations that can delete data, rewrite durable rows,
drop or rename schemas or tables, reset databases, or otherwise lose data until
the human has approved a concrete migration plan for that run.
