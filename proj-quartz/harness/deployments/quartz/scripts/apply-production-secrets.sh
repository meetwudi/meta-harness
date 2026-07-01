#!/bin/sh
# Generated file. Do not edit directly; update the Quartz Deployment first.
# Harness-Requirement: proj-quartz.production-cloud-run-deployment

set -eu

PROJECT_ID="${PROJECT_ID:?PROJECT_ID is required}"
ENV_FILE="${ENV_FILE:-proj-quartz/.env}"
SKIP_POSTGRES_URL="${SKIP_POSTGRES_URL:-false}"

if [ "$SKIP_POSTGRES_URL" != "true" ]; then
  POSTGRES_URL_SECRET_VALUE="${POSTGRES_URL_SECRET_VALUE:?POSTGRES_URL_SECRET_VALUE is required}"
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 1
fi

set -a
. "$ENV_FILE"
set +a

ensure_secret() {
  secret_name="$1"
  if ! gcloud secrets describe "$secret_name" --project "$PROJECT_ID" >/dev/null 2>&1; then
    gcloud secrets create "$secret_name" --project "$PROJECT_ID" --replication-policy=automatic
  fi
}

write_secret_value() {
  secret_name="$1"
  value="$2"
  if [ -z "$value" ]; then
    echo "Refusing to write empty secret: $secret_name" >&2
    exit 1
  fi
  ensure_secret "$secret_name"
  printf '%s' "$value" | gcloud secrets versions add "$secret_name" \
    --project "$PROJECT_ID" \
    --data-file=-
}

openai_api_key="${OPENAI_API_KEY:-}"
if [ -z "$openai_api_key" ]; then
  echo "OPENAI_API_KEY must be present in the shell environment." >&2
  exit 1
fi

write_secret_value quartz-openai-api-key "$openai_api_key"
if [ "$SKIP_POSTGRES_URL" != "true" ]; then
  write_secret_value quartz-postgres-url "$POSTGRES_URL_SECRET_VALUE"
fi
write_secret_value quartz-google-client-id "${QUARTZ_GOOGLE_CLIENT_ID:-}"
write_secret_value quartz-google-client-secret "${QUARTZ_GOOGLE_CLIENT_SECRET:-}"
write_secret_value quartz-resend-api-key "${QUARTZ_RESEND_API_KEY:-}"
write_secret_value quartz-resend-from "${QUARTZ_RESEND_FROM:-}"
