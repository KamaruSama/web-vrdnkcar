#!/bin/bash
# ====================================================================
# VRDNK Car Booking - Database Backup Script
# ====================================================================
# รองรับทั้ง Docker และ k3s
#   Docker : อ่าน credential จาก .env, pg_dump ผ่าน host port
#   k3s    : อ่าน credential จาก kubectl secret, pg_dump ผ่าน exec pod
#
# การใช้งาน:
#   bash scripts/backup-database.sh           → auto backup (daily/ ถูกลบอัตโนมัติหลัง 21 วัน)
#   bash scripts/backup-database.sh --manual  → manual backup (manual/ ไม่ถูกลบอัตโนมัติ)
#
# ตั้ง crontab: bash scripts/setup-backup.sh
# ====================================================================

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NAMESPACE="web-vrdnkcar"

# ── Detect backup root ───────────────────────────────────────
# K3s: เขียนลง PVC path โดยตรง (app pod อ่านจากที่เดียวกัน)
# Docker/other: เขียนลง project dir
_detect_backup_root() {
  local KUBECTL=""
  if command -v kubectl &>/dev/null && kubectl get ns "$NAMESPACE" &>/dev/null 2>&1; then
    KUBECTL="kubectl"
  elif command -v sudo &>/dev/null && sudo kubectl get ns "$NAMESPACE" &>/dev/null 2>&1; then
    KUBECTL="sudo kubectl"
  fi

  if [ -n "$KUBECTL" ]; then
    local PV_NAME=$($KUBECTL get pvc backup-data -n "$NAMESPACE" -o jsonpath='{.spec.volumeName}' 2>/dev/null)
    if [ -n "$PV_NAME" ]; then
      local PVC_PATH=$($KUBECTL get pv "$PV_NAME" -o jsonpath='{.spec.local.path}' 2>/dev/null)
      if [ -n "$PVC_PATH" ] && sudo test -d "$PVC_PATH"; then
        echo "$PVC_PATH"
        return
      fi
    fi
  fi
  echo "$PROJECT_ROOT/backup-auto"
}

BACKUP_ROOT=$(_detect_backup_root)
LOG_FILE="$BACKUP_ROOT/backup.log"

TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
DATE_YEAR=$(date +%Y)
DATE_MONTH=$(date +%m)
DATE_DAY=$(date +%d)

# --manual flag → เก็บใน manual/ (ไม่ถูก cleanup อัตโนมัติ)
if [ "${1:-}" = "--manual" ]; then
  BACKUP_DIR="$BACKUP_ROOT/manual"
  BACKUP_MODE="manual"
else
  BACKUP_DIR="$BACKUP_ROOT/daily/$DATE_YEAR/$DATE_MONTH/$DATE_DAY"
  BACKUP_MODE="auto"
fi

log()  { echo "[$(date +%Y-%m-%d\ %H:%M:%S)] $1" | tee -a "$LOG_FILE"; }
fail() { log "ERROR: $1"; exit 1; }

mkdir -p "$BACKUP_ROOT"

# ── Detect deployment mode ─────────────────────────────────────
KUBECTL=""
if command -v kubectl &>/dev/null && kubectl get ns "$NAMESPACE" &>/dev/null 2>&1; then
  KUBECTL="kubectl"
elif command -v sudo &>/dev/null && sudo kubectl get ns "$NAMESPACE" &>/dev/null 2>&1; then
  KUBECTL="sudo kubectl"
fi

if [ -n "$KUBECTL" ]; then
  DEPLOY_MODE="k3s"
elif [ -f "$PROJECT_ROOT/.env" ]; then
  DEPLOY_MODE="docker"
else
  fail "Cannot detect mode: no kubectl access and no .env found"
fi

log "Starting backup (deploy: $DEPLOY_MODE, type: $BACKUP_MODE)..."

# ── Load credentials ───────────────────────────────────────────
if [ "$DEPLOY_MODE" = "k3s" ]; then
  # อ่านจาก k3s Secret โดยตรง (authoritative)
  DB_USER=$($KUBECTL get secret app-secrets -n "$NAMESPACE" \
    -o jsonpath='{.data.DB_USER}' 2>/dev/null | base64 -d 2>/dev/null || true)
  DB_PASSWORD=$($KUBECTL get secret app-secrets -n "$NAMESPACE" \
    -o jsonpath='{.data.DB_PASSWORD}' 2>/dev/null | base64 -d 2>/dev/null || true)
  DB_NAME=$($KUBECTL get secret app-secrets -n "$NAMESPACE" \
    -o jsonpath='{.data.DB_NAME}' 2>/dev/null | base64 -d 2>/dev/null || true)

  # Fallback 1: .env (ถ้ายังมีบน host)
  if [ -z "$DB_USER" ] && [ -f "$PROJECT_ROOT/.env" ]; then
    log "kubectl secret unavailable, falling back to .env..."
    set -a; source "$PROJECT_ROOT/.env"; set +a
    DB_USER="${POSTGRES_USER:-${DB_USER:-}}"
    DB_PASSWORD="${POSTGRES_PASSWORD:-${DB_PASSWORD:-}}"
    DB_NAME="${POSTGRES_DB:-${DB_NAME:-}}"
  fi

  # ถ้ายังไม่ได้ credential → fail
  [ -z "$DB_USER" ] && fail "Cannot read credentials. Ensure kubectl access or .env exists on host."

else
  # Docker: อ่านจาก .env
  set -a; source "$PROJECT_ROOT/.env"; set +a
  DB_USER="${POSTGRES_USER}"
  DB_PASSWORD="${POSTGRES_PASSWORD}"
  DB_NAME="${POSTGRES_DB}"
fi

[ -z "$DB_USER" ]     && fail "Missing DB_USER"
[ -z "$DB_PASSWORD" ] && fail "Missing DB_PASSWORD"
[ -z "$DB_NAME" ]     && fail "Missing DB_NAME"

mkdir -p "$BACKUP_DIR"
PREFIX=$( [ "$BACKUP_MODE" = "manual" ] && echo "manual_db" || echo "car_booking_db" )
DB_BACKUP_FILE="$BACKUP_DIR/${PREFIX}_${TIMESTAMP}.dump"

# ── 1. Database backup ─────────────────────────────────────────
if [ "$DEPLOY_MODE" = "k3s" ]; then
  POSTGRES_POD=$($KUBECTL get pod -n "$NAMESPACE" -l app=postgres \
    -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)
  [ -z "$POSTGRES_POD" ] && fail "Cannot find postgres pod in namespace $NAMESPACE"

  log "Dumping via kubectl exec → pod: $POSTGRES_POD"
  $KUBECTL exec -n "$NAMESPACE" "$POSTGRES_POD" -- \
    pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc -Z 9 \
    > "$DB_BACKUP_FILE" 2>>"$LOG_FILE" || fail "pg_dump failed"
else
  DB_HOST="localhost"
  DB_PORT="${DB_PORT:-5438}"
  log "Dumping: $DB_NAME @ $DB_HOST:$DB_PORT"
  export PGPASSWORD="$DB_PASSWORD"
  pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -Fc -Z 9 -f "$DB_BACKUP_FILE" 2>>"$LOG_FILE" || fail "pg_dump failed"
  unset PGPASSWORD
fi

ln -sf "$DB_BACKUP_FILE" "$BACKUP_ROOT/latest.dump"
log "DB backup: $(basename "$DB_BACKUP_FILE") ($(du -h "$DB_BACKUP_FILE" | cut -f1))"

# ── 2. Uploads backup ──────────────────────────────────────────
UL_PREFIX=$( [ "$BACKUP_MODE" = "manual" ] && echo "manual_uploads" || echo "uploads" )
ARCHIVE="$BACKUP_DIR/${UL_PREFIX}_${TIMESTAMP}.tar.gz"

if [ "$DEPLOY_MODE" = "k3s" ]; then
  APP_POD=$($KUBECTL get pod -n "$NAMESPACE" -l app=web-vrdnkcar-app \
    -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)
  if [ -n "$APP_POD" ]; then
    # tar ภายใน pod แล้ว stream ออกมาโดยตรง — ไม่ต้องสร้าง temp files
    if $KUBECTL exec -n "$NAMESPACE" "$APP_POD" -- \
      tar -czf - -C /app/public uploads 2>>"$LOG_FILE" > "$ARCHIVE"; then
      ln -sf "$ARCHIVE" "$BACKUP_ROOT/latest-uploads.tar.gz"
      log "Uploads: $(basename "$ARCHIVE") ($(du -h "$ARCHIVE" | cut -f1))"
    else
      rm -f "$ARCHIVE"
      log "Uploads: tar from pod failed, skipping"
    fi
  else
    log "Uploads: app pod not found, skipping"
  fi
else
  UPLOADS_SRC="$PROJECT_ROOT/public/uploads"
  if [ -d "$UPLOADS_SRC" ] && [ -n "$(ls -A "$UPLOADS_SRC" 2>/dev/null)" ]; then
    tar -czf "$ARCHIVE" --exclude="*.log" -C "$PROJECT_ROOT/public" uploads 2>>"$LOG_FILE" || true
    ln -sf "$ARCHIVE" "$BACKUP_ROOT/latest-uploads.tar.gz"
    log "Uploads: $(basename "$ARCHIVE") ($(du -h "$ARCHIVE" | cut -f1))"
  else
    log "Uploads: empty or not found, skipping"
  fi
fi

# ── 3. Year-end archive ────────────────────────────────────────
if [ "$(date +%m-%d)" = "12-31" ]; then
  mkdir -p "$BACKUP_ROOT/archive"
  cp "$DB_BACKUP_FILE" "$BACKUP_ROOT/archive/${DATE_YEAR}.dump"
  log "Year-end archive: ${DATE_YEAR}.dump"
fi

# ── 4. Cleanup old backups ─────────────────────────────────────
if [ -f "$PROJECT_ROOT/scripts/cleanup-old-backups.sh" ]; then
  bash "$PROJECT_ROOT/scripts/cleanup-old-backups.sh"
fi

TOTAL=$(find "$BACKUP_ROOT" -name "*.dump" -type f 2>/dev/null | wc -l)
SIZE=$(du -sh "$BACKUP_ROOT" 2>/dev/null | cut -f1 || echo "?")
log "Done. $TOTAL dump files, $SIZE total."
