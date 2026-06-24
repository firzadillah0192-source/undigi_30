#!/usr/bin/env sh
set -eu

APP_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
cd "$APP_DIR"

echo "Deploying Digital Wedding Invitation..."

mkdir -p uploads/couple uploads/gallery uploads/love-story uploads/music data

chmod 755 uploads uploads/couple uploads/gallery uploads/love-story uploads/music data 2>/dev/null || true

if [ ! -f data/wedding.db ]; then
  echo "Database not found. Running seeder..."
  php data/seeder.php
fi

if [ -f data/wedding.db ]; then
  chmod 644 data/wedding.db 2>/dev/null || true
fi

if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
  echo "Created .env from .env.example."
fi

echo "Deployment preparation complete."
