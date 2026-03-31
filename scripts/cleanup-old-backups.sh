#!/bin/bash
# ====================================================================
# VRDNK Car Booking - Backup Cleanup Script
# ====================================================================
# Retention Policy:
#   Daily:   14 days active + 7 grace  = 21 days  → weekly
#   Weekly:  56 days active + 28 grace = 84 days  → monthly
#   Monthly: 730 days active + 365 grace = 1095 days → archive
#   Archive: เก็บตลอดไป
# ====================================================================

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_ROOT="$PROJECT_ROOT/backup-auto"
LOG_FILE="$BACKUP_ROOT/cleanup.log"

DAILY_TOTAL=21
WEEKLY_TOTAL=84
MONTHLY_TOTAL=1095

log() { echo "[$(date +%Y-%m-%d\ %H:%M:%S)] $1" | tee -a "$LOG_FILE"; }

get_age_days() {
    local file="$1"
    local file_time
    file_time=$(stat -c %Y "$file" 2>/dev/null || echo 0)
    echo $(( ($(date +%s) - file_time) / 86400 ))
}

mkdir -p "$BACKUP_ROOT/daily" "$BACKUP_ROOT/weekly" "$BACKUP_ROOT/monthly" "$BACKUP_ROOT/archive"

DELETED=0
ARCHIVED=0

log "Starting cleanup..."

# ── Daily → Weekly ──────────────────────────────────────────────────
while IFS= read -r -d '' file; do
    AGE=$(get_age_days "$file")
    if [ "$AGE" -gt "$DAILY_TOTAL" ]; then
        WEEK=$(date -r "$file" +%Y-%W 2>/dev/null || date +%Y-%W)
        WEEK_FILE="$BACKUP_ROOT/weekly/W${WEEK}.dump"
        mkdir -p "$BACKUP_ROOT/weekly"
        if [ ! -f "$WEEK_FILE" ] || [ "$file" -nt "$WEEK_FILE" ]; then
            cp "$file" "$WEEK_FILE"
            ARCHIVED=$((ARCHIVED + 1))
        fi
        rm "$file"
        DELETED=$((DELETED + 1))
        log "Daily→Weekly: $(basename "$file") (${AGE}d)"
    fi
done < <(find "$BACKUP_ROOT/daily" -name "*.dump" -type f -print0 2>/dev/null)

# Cleanup old tar.gz in daily
while IFS= read -r -d '' file; do
    AGE=$(get_age_days "$file")
    if [ "$AGE" -gt "$DAILY_TOTAL" ]; then
        rm "$file"
        DELETED=$((DELETED + 1))
        log "Deleted old daily archive: $(basename "$file") (${AGE}d)"
    fi
done < <(find "$BACKUP_ROOT/daily" -name "*.tar.gz" -type f -print0 2>/dev/null)

# ── Weekly → Monthly ────────────────────────────────────────────────
while IFS= read -r -d '' file; do
    AGE=$(get_age_days "$file")
    if [ "$AGE" -gt "$WEEKLY_TOTAL" ]; then
        MONTH=$(date -r "$file" +%Y-%m 2>/dev/null || date +%Y-%m)
        MONTH_FILE="$BACKUP_ROOT/monthly/${MONTH}.dump"
        mkdir -p "$BACKUP_ROOT/monthly"
        if [ ! -f "$MONTH_FILE" ] || [ "$file" -nt "$MONTH_FILE" ]; then
            cp "$file" "$MONTH_FILE"
            ARCHIVED=$((ARCHIVED + 1))
        fi
        rm "$file"
        DELETED=$((DELETED + 1))
        log "Weekly→Monthly: $(basename "$file") (${AGE}d)"
    fi
done < <(find "$BACKUP_ROOT/weekly" -name "*.dump" -type f -print0 2>/dev/null)

# ── Monthly → Archive ───────────────────────────────────────────────
while IFS= read -r -d '' file; do
    AGE=$(get_age_days "$file")
    if [ "$AGE" -gt "$MONTHLY_TOTAL" ]; then
        YEAR=$(date -r "$file" +%Y 2>/dev/null || date +%Y)
        ARCHIVE_FILE="$BACKUP_ROOT/archive/${YEAR}.dump"
        mkdir -p "$BACKUP_ROOT/archive"
        if [ ! -f "$ARCHIVE_FILE" ] || [ "$file" -nt "$ARCHIVE_FILE" ]; then
            cp "$file" "$ARCHIVE_FILE"
            ARCHIVED=$((ARCHIVED + 1))
        fi
        rm "$file"
        DELETED=$((DELETED + 1))
        log "Monthly→Archive: $(basename "$file") (${AGE}d)"
    fi
done < <(find "$BACKUP_ROOT/monthly" -name "*.dump" -type f -print0 2>/dev/null)

log "Cleanup done. Deleted: $DELETED, Archived: $ARCHIVED"
