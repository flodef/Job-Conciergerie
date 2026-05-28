#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────
# reset-dev-db.sh
# Optionally dumps prod DB, then restores it into dev DB.
# Dev DATABASE_URL is read from .env.local automatically.
# ─────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$ROOT_DIR/.env.local"
DUMP_FILE="/tmp/prod_dump_$(date +%Y%m%d_%H%M%S).sql"

# ── Colours ───────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

info()    { echo -e "${CYAN}→ $*${RESET}"; }
success() { echo -e "${GREEN}✓ $*${RESET}"; }
warn()    { echo -e "${YELLOW}⚠ $*${RESET}"; }
error()   { echo -e "${RED}✗ $*${RESET}" >&2; exit 1; }

# ── Read dev DATABASE_URL from .env.local ─────
if [[ ! -f "$ENV_FILE" ]]; then
  error ".env.local not found at $ENV_FILE"
fi

DEV_DB_URL=$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 | cut -d'=' -f2- | tr -d '"' | tr -d "'")
if [[ -z "$DEV_DB_URL" ]]; then
  error "DATABASE_URL not found in .env.local"
fi

echo ""
echo -e "${BOLD}╔══════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║        Dev DB Reset Utility          ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════╝${RESET}"
echo ""
info "Dev DB: ${DEV_DB_URL%%@*}@***"
echo ""

# ── Ask whether to dump prod ──────────────────
read -rp "$(echo -e "${YELLOW}Dump from production DB first? [y/N] ${RESET}")" DUMP_PROD
DUMP_PROD="${DUMP_PROD:-n}"

if [[ "$DUMP_PROD" =~ ^[Yy]$ ]]; then
  echo ""
  read -rsp "$(echo -e "${YELLOW}Enter production DATABASE_URL: ${RESET}")" PROD_DB_URL
  echo ""

  if [[ -z "$PROD_DB_URL" ]]; then
    error "No production URL provided."
  fi

  echo ""
  info "Dumping production database..."
  if pg_dump \
    --no-owner \
    --no-acl \
    --no-privileges \
    --schema=public \
    --format=plain \
    "$PROD_DB_URL" \
    > "$DUMP_FILE" 2>/dev/null; then
    success "Dump saved to $DUMP_FILE"
  else
    error "pg_dump failed. Check your production connection string."
  fi
else
  # Ask for an existing dump file
  echo ""
  read -rp "$(echo -e "${YELLOW}Path to existing SQL dump file (leave blank to abort): ${RESET}")" DUMP_FILE_INPUT
  if [[ -z "$DUMP_FILE_INPUT" ]]; then
    warn "Aborted."
    exit 0
  fi
  DUMP_FILE="${DUMP_FILE_INPUT/#\~/$HOME}"
  if [[ ! -f "$DUMP_FILE" ]]; then
    error "File not found: $DUMP_FILE"
  fi
  success "Using dump: $DUMP_FILE"
fi

# ── Safety confirmation ───────────────────────
echo ""
warn "This will ERASE and replace all data in your dev database."
read -rp "$(echo -e "${RED}Type 'yes' to confirm: ${RESET}")" CONFIRM
if [[ "$CONFIRM" != "yes" ]]; then
  warn "Aborted."
  exit 0
fi

# ── Drop & recreate the public schema ────────
echo ""
info "Resetting public schema in dev database..."
psql "$DEV_DB_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" > /dev/null 2>&1 \
  || error "Failed to reset schema. Check your dev connection string."
success "Schema reset."

# ── Restore dump into dev ─────────────────────
info "Restoring dump into dev database..."
if psql "$DEV_DB_URL" -f "$DUMP_FILE" > /dev/null 2>&1; then
  success "Restore complete!"
else
  error "psql restore failed. The dump file may be incompatible."
fi

echo ""
success "Dev database has been reset successfully."
echo ""
