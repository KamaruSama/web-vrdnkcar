#!/bin/bash
# ====================================================================
# VRDNK Car Booking - Backup Setup Script
# ====================================================================
# ตรวจสอบและติดตั้งระบบ backup อัตโนมัติ
#   - ตรวจจับ mode: k3s หรือ Docker
#   - สร้าง backup-auto/ directory
#   - ติดตั้ง crontab (01:00 ทุกวัน)
#   - ทดสอบ backup ด้วยมือครั้งแรก
# ====================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_ROOT="$PROJECT_DIR/backup-auto"
BACKUP_SCRIPT="$PROJECT_DIR/scripts/backup-database.sh"
NAMESPACE="web-vrdnkcar"

step() { echo -e "${BLUE}[setup-backup] $1${NC}"; }
ok()   { echo -e "${GREEN}  ✓ $1${NC}"; }
warn() { echo -e "${YELLOW}  ⚠ $1${NC}"; }
err()  { echo -e "${RED}  ✗ $1${NC}"; }

echo -e "${BLUE}=== Backup Setup ===${NC}"
echo "  Project : $PROJECT_DIR"

# ── Detect mode ───────────────────────────────────────────────
KUBECTL=""
DEPLOY_MODE="unknown"

if command -v kubectl &>/dev/null && kubectl get ns "$NAMESPACE" &>/dev/null 2>&1; then
  KUBECTL="kubectl"
  DEPLOY_MODE="k3s"
elif command -v sudo &>/dev/null && sudo kubectl get ns "$NAMESPACE" &>/dev/null 2>&1; then
  KUBECTL="sudo kubectl"
  DEPLOY_MODE="k3s"
elif [ -f "$PROJECT_DIR/.env" ]; then
  DEPLOY_MODE="docker"
fi

echo "  Mode    : $DEPLOY_MODE"
echo ""

if [ "$DEPLOY_MODE" = "unknown" ]; then
  err "Cannot detect mode. Run from the project directory after deploying."
  exit 1
fi

# ── Step 1: Create directories ────────────────────────────────
step "Creating backup directories..."
mkdir -p "$BACKUP_ROOT/daily"
ok "backup-auto/daily"

# ── Step 2: Script permissions ────────────────────────────────
step "Setting script permissions..."
chmod +x "$BACKUP_SCRIPT"
ok "chmod +x backup-database.sh"
chmod +x "$0"
ok "chmod +x setup-backup.sh"

# ── Step 3: pg_dump (Docker mode only — k3s uses kubectl exec) ─
if [ "$DEPLOY_MODE" = "docker" ]; then
  step "Checking pg_dump..."
  if ! command -v pg_dump &>/dev/null; then
    warn "pg_dump not found — installing postgresql-client..."
    if sudo apt-get install -y postgresql-client 2>/dev/null; then
      ok "postgresql-client installed"
    else
      err "Install failed. Run manually: sudo apt install postgresql-client"
      exit 1
    fi
  else
    ok "pg_dump: $(pg_dump --version | head -1)"
  fi
fi

# ── Step 4: Verify credentials ────────────────────────────────
step "Verifying credentials..."
if [ "$DEPLOY_MODE" = "k3s" ]; then
  DB_USER=$($KUBECTL get secret app-secrets -n "$NAMESPACE" \
    -o jsonpath='{.data.DB_USER}' 2>/dev/null | base64 -d 2>/dev/null || true)
  if [ -n "$DB_USER" ]; then
    ok "kubectl secret app-secrets → DB_USER=$DB_USER"
  else
    warn "kubectl secret unreadable — backup script will try .env fallback"
  fi
else
  if [ -f "$PROJECT_DIR/.env" ]; then
    source "$PROJECT_DIR/.env" 2>/dev/null || true
    if [ -n "$POSTGRES_USER" ] && [ -n "$POSTGRES_PASSWORD" ] && [ -n "$POSTGRES_DB" ]; then
      ok ".env → DB=$POSTGRES_DB, USER=$POSTGRES_USER"
    else
      err ".env missing POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB"
      exit 1
    fi
  else
    err ".env not found at $PROJECT_DIR/.env"
    exit 1
  fi
fi

# ── Step 5: Setup crontab ─────────────────────────────────────
step "Setting up crontab (01:00 daily)..."
CRON_JOB="0 1 * * * bash $BACKUP_SCRIPT >> $BACKUP_ROOT/backup.log 2>&1"

if crontab -l 2>/dev/null | grep -qF "$BACKUP_SCRIPT"; then
  ok "Crontab entry already exists"
else
  (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
  ok "Added crontab: $CRON_JOB"
fi

# ── Step 6: Test backup ───────────────────────────────────────
step "Running test backup..."
echo ""
if bash "$BACKUP_SCRIPT"; then
  echo ""
  ok "Test backup completed successfully"
else
  echo ""
  err "Test backup failed — check $BACKUP_ROOT/backup.log"
  exit 1
fi

# ── Summary ───────────────────────────────────────────────────
echo ""
echo -e "${GREEN}=== Setup complete! ===${NC}"
echo "  Backup dir : $BACKUP_ROOT/daily/"
echo "  Schedule   : 01:00 daily (crontab)"
echo "  Log        : $BACKUP_ROOT/backup.log"
echo ""
echo "Useful commands:"
echo "  Manual backup : bash $BACKUP_SCRIPT"
echo "  View log      : tail -f $BACKUP_ROOT/backup.log"
echo "  Check crontab : crontab -l"
