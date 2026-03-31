#!/bin/bash
# Pull production data snapshot for development
set -e

NAMESPACE="web-vrdnkcar"
DB_USER="vrdnkcar"
DB_NAME="car_booking"
SNAPSHOT="/tmp/prod_snapshot_${DB_NAME}.sql"
COMPOSE_FILE="docker-compose.dev.yml"

echo "🔄 Pulling production database snapshot..."

# Check dev container is running
if ! docker ps --format '{{.Names}}' | grep -q "web-vrdnkcar-db-dev"; then
  echo "❌ Dev container not running. Start it first:"
  echo "   docker compose -f ${COMPOSE_FILE} up -d"
  exit 1
fi

# 1. Export from K3s production (read-only)
echo "📦 Exporting from K3s prod..."
sudo kubectl exec -n ${NAMESPACE} postgres-0 -- \
  pg_dump -U ${DB_USER} --no-owner --no-acl ${DB_NAME} \
  > ${SNAPSHOT}

echo "   Size: $(du -sh ${SNAPSHOT} | cut -f1)"

# 2. Import to local dev database (drop & recreate for clean state)
echo "📥 Importing to dev database..."
docker exec web-vrdnkcar-db-dev \
  psql -U ${DB_USER} -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};" 2>/dev/null || true
docker exec web-vrdnkcar-db-dev \
  psql -U ${DB_USER} -d postgres -c "CREATE DATABASE ${DB_NAME};"
docker exec -i web-vrdnkcar-db-dev \
  psql -U ${DB_USER} -d ${DB_NAME} < ${SNAPSHOT}

# 3. Cleanup
rm ${SNAPSHOT}

echo "✅ Production snapshot imported to dev!"
echo "⚠️  ข้อมูลจริง — อย่า commit หรือ share ออกไป"
