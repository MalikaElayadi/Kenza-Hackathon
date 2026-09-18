#!/bin/bash

# Kenza Database Initialization & Validation Script

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌱 KENZA DATABASE INITIALIZATION & VALIDATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is running
echo "📦 Checking Docker status..."
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Docker is running${NC}"

# Check if services are healthy
echo ""
echo "🔍 Checking service health..."

wait_for_service() {
  local service=$1
  local port=$2
  local max_attempts=30
  local attempt=1
  
  echo -n "  Waiting for $service..."
  
  while [ $attempt -le $max_attempts ]; do
    if nc -z localhost $port 2>/dev/null; then
      echo -e " ${GREEN}✅ Ready${NC}"
      return 0
    fi
    echo -n "."
    sleep 1
    ((attempt++))
  done
  
  echo -e " ${RED}❌ Timeout${NC}"
  return 1
}

# Wait for services
wait_for_service "PostgreSQL" 5432 || exit 1
wait_for_service "Redis" 6379 || exit 1

# Run seeder
echo ""
echo "🌱 Running database seeder..."
if npm run seed; then
  echo -e "${GREEN}✅ Seeding completed successfully${NC}"
else
  echo -e "${RED}❌ Seeding failed${NC}"
  exit 1
fi

# Validate data
echo ""
echo "📊 Validating data counts..."

validate_count() {
  local table=$1
  local expected=$2
  
  count=$(docker exec kenza-postgres psql -U postgres -d kenza -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null || echo "0")
  count=$(echo $count | xargs)  # Trim whitespace
  
  if [ "$count" = "$expected" ]; then
    echo -e "  ${GREEN}✅${NC} $table: $count/$expected"
    return 0
  else
    echo -e "  ${RED}❌${NC} $table: $count/$expected"
    return 1
  fi
}

# Validate all tables
all_valid=true

validate_count "products" "80" || all_valid=false
validate_count "clients" "120" || all_valid=false
validate_count "orders" "320" || all_valid=false
validate_count "order_items" "449" || all_valid=false
validate_count "shipping_rates" "12" || all_valid=false
validate_count "promotions" "12" || all_valid=false

echo ""

if [ "$all_valid" = true ]; then
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}🎉 ALL VALIDATIONS PASSED!${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "✅ Database is ready!"
  echo ""
  echo "🚀 Access points:"
  echo "  - Chat UI: http://localhost:3000"
  echo "  - API: http://localhost:3001"
  echo "  - PostgreSQL: localhost:5432"
  echo "  - Redis: localhost:6379"
  exit 0
else
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${RED}❌ VALIDATION FAILED!${NC}"
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  exit 1
fi
