# Generated file. Do not edit directly; update the Quartz Deployment first.
# Harness-Requirement: proj-quartz.production-cloud-run-deployment
# This image builds Quartz from the repository root so production Library
# discovery can see both proj-quartz and meta-harness filesystem Libraries.

FROM node:22-bookworm-slim AS build

WORKDIR /workspace
ENV NEXT_TELEMETRY_DISABLED=1

COPY . .

RUN npm ci --prefix meta-harness/knowledge-agent/impl
RUN npm ci --prefix meta-harness/librarian/impl
RUN npm ci --install-links --prefix proj-quartz/app

RUN npm --prefix meta-harness/storage/impl run build
RUN npm --prefix meta-harness/librarian/impl run build
RUN npm --prefix meta-harness/knowledge-agent/impl run build
RUN npm --prefix proj-quartz/app run build

FROM node:22-bookworm-slim AS runtime

WORKDIR /workspace
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV QUARTZ_REPO_ROOT=/workspace
ENV QUARTZ_PROJECT_ROOT=/workspace/proj-quartz
ENV QUARTZ_PROJECT_CONFIG=proj-quartz/.meta-harness.json

COPY --from=build /workspace /workspace

EXPOSE 8080

CMD ["npm", "--prefix", "proj-quartz/app", "run", "start", "--", "-H", "0.0.0.0", "-p", "8080"]
