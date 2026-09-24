#!/bin/sh
set -e
attempt=0
until npx prisma migrate deploy; do
  attempt=$((attempt + 1))
  if [ "$attempt" -gt 30 ]; then
    echo "database migrations did not apply"
    exit 1
  fi
  echo "waiting for postgres..."
  sleep 2
done
node dist/seed.js
node dist/main.js
