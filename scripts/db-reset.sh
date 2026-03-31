#!/bin/bash
# Reset development database (destroy and recreate)

set -e

echo "🔄 Resetting development database..."

# 1. Stop and remove containers + volumes
echo "🗑️  Removing old containers and data..."
docker-compose -f docker-compose.dev.yml down -v

# 2. Start fresh
echo "🚀 Starting fresh database..."
docker-compose -f docker-compose.dev.yml up -d db

# 3. Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 5

# Check if database is ready
until docker-compose -f docker-compose.dev.yml exec -T db pg_isready -U vrdnkcar; do
  echo "Waiting for database..."
  sleep 2
done

echo "✅ Database reset complete!"
echo "💡 Next steps:"
echo "   npm run dev           - Start development (DB auto-initialized)"
echo "   npm run db:pull-prod  - Pull production snapshot (optional)"
