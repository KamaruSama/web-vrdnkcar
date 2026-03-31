#!/bin/bash

set -e

echo "Starting vrdnk car booking app deployment..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo -e "${BLUE}Step 1: Stopping app container before build (to avoid .next/standalone permission issues)...${NC}"
docker compose -f docker-compose.prod.yml stop app 2>/dev/null || true

# Fix ownership if .next exists (may be owned by root from previous container run)
if [ -d ".next" ]; then
  sudo chown -R "$(whoami)":"$(whoami)" .next/ 2>/dev/null || true
fi

echo -e "${BLUE}Step 2: Building Next.js application...${NC}"
npm run build

echo -e "${BLUE}Step 3: Preparing standalone build output...${NC}"
# Ensure the directories exist
mkdir -p .next/standalone
mkdir -p .next/static
mkdir -p public/uploads

# The standalone build creates everything in .next/standalone
# Verify the build output exists
if [ ! -d ".next/standalone" ]; then
  echo -e "${RED}Error: .next/standalone directory not found after build${NC}"
  exit 1
fi

if [ ! -d ".next/static" ]; then
  echo -e "${RED}Error: .next/static directory not found after build${NC}"
  exit 1
fi

echo -e "${GREEN}Build output verified${NC}"

echo -e "${BLUE}Step 4: Starting Docker containers...${NC}"
docker compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
echo -e "${BLUE}Waiting for services to start...${NC}"
sleep 10

# Check if containers are running
if docker ps | grep -q "web-vrdnkcar-app"; then
  echo -e "${GREEN}App container is running${NC}"
else
  echo -e "${RED}Error: App container failed to start${NC}"
  docker compose -f docker-compose.prod.yml logs app
  exit 1
fi

if docker ps | grep -q "web-vrdnkcar-db"; then
  echo -e "${GREEN}Database container is running${NC}"
else
  echo -e "${RED}Error: Database container failed to start${NC}"
  docker compose -f docker-compose.prod.yml logs db
  exit 1
fi

echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${GREEN}Access the app at: https://vrdsp.likezara.com${NC}"
echo -e "${BLUE}To view logs: docker compose -f docker-compose.prod.yml logs -f app${NC}"
