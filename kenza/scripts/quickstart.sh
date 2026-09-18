#!/bin/bash

# Quick start script for Kenza

echo "🚀 Starting Kenza..."

# Check if .env exists
if [ ! -f .env ]; then
  echo "⚠️  .env file not found. Creating from .env.example..."
  cp .env.example .env
  echo "📝 Please edit .env with your LLM API keys"
fi

# Check if Docker is running
echo "Checking Docker status..."
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker first."
  exit 1
fi

echo "✅ Docker is running"
echo ""
echo "Starting Docker Compose services..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be ready (30 seconds)..."
sleep 5

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
for i in {1..30}; do
  if docker exec kenza-postgres pg_isready -U postgres -d kenza > /dev/null 2>&1; then
    echo "✅ PostgreSQL is ready"
    break
  fi
  echo -n "."
  sleep 1
done

# Wait for Redis to be ready
echo "Waiting for Redis..."
for i in {1..30}; do
  if docker exec kenza-redis redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is ready"
    break
  fi
  echo -n "."
  sleep 1
done

echo ""
echo "📊 Running database seeder..."
npm run seed

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Kenza is ready!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Access points:"
echo "  - Chat UI: http://localhost:3000"
echo "  - API: http://localhost:3001"
echo "  - API Docs: http://localhost:3001/docs"
echo ""
echo "📖 Useful commands:"
echo "  npm run logs       - View logs"
echo "  npm run down       - Stop services"
echo "  npm run clean      - Remove all data and restart"
echo ""
