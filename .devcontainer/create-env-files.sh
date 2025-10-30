#!/bin/sh
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Generate a new JWT secret key
JWT="$(openssl rand -base64 48)"

# Escape characters that are special in sed replacement (& and backslash)
ESC_JWT=$(printf '%s' "$JWT" | sed 's/\\/\\\\/g; s/&/\\&/g')

# Services that need the JWT inserted into their .env files
JWT_SERVICES="activity-tracking analytics graphql-gateway"

for svc in $JWT_SERVICES; do
  EXAMPLE="$ROOT/$svc/.env.example"
  DEST="$ROOT/$svc/.env"

  # copy example if present, otherwise create empty .env
  if [ -f "$EXAMPLE" ]; then
    cp "$EXAMPLE" "$DEST"
  else
    : > "$DEST"
  fi

  # replace placeholder JWT_KEY_HERE with actual JWT
  if grep -q 'JWT_KEY_HERE' "$DEST"; then
    sed -i.bak "s|JWT_KEY_HERE|$ESC_JWT|g" "$DEST" && rm -f "$DEST.bak"
  fi
done

# ai-speech-parser: copy .env.example -> .env
AI_DIR="ai-speech-parser"
AI_EXAMPLE="$ROOT/$AI_DIR/.env.example"
AI_DEST="$ROOT/$AI_DIR/.env"
if [ -f "$AI_EXAMPLE" ]; then
  cp "$AI_EXAMPLE" "$AI_DEST"
else
  : > "$AI_DEST"
fi

# authservice application.properties: copy example and replace placeholder
APPTPL="$ROOT/authservice/src/main/resources/application.properties.example"
APPDST="$ROOT/authservice/src/main/resources/application.properties"

if [ -f "$APPTPL" ]; then
  cp "$APPTPL" "$APPDST"
else
  : > "$APPDST"
fi

if grep -q 'JWT_KEY_HERE' "$APPDST"; then
  sed -i.bak "s|JWT_KEY_HERE|$ESC_JWT|g" "$APPDST" && rm -f "$APPDST.bak"
fi

echo ".env files and authservice application.properties created/updated"