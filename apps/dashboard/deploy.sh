#!/bin/bash

# Task Master Dashboard Deployment Script
# This script builds and deploys the application to production

set -e

echo "🚀 Starting Task Master Dashboard Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running in correct directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Run this script from the dashboard directory.${NC}"
    exit 1
fi

# Function to check command existence
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command_exists docker; then
    echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

if ! command_exists docker-compose; then
    echo -e "${RED}Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites met${NC}"

# Build the production application
echo "🔨 Building production application..."
npm run build

# Check if build was successful
if [ ! -d ".next" ]; then
    echo -e "${RED}Build failed. .next directory not found.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Build successful${NC}"

# Create SSL directory if it doesn't exist
if [ ! -d "ssl" ]; then
    echo "📁 Creating SSL directory..."
    mkdir -p ssl
    echo -e "${YELLOW}⚠ Add your SSL certificates to the ssl/ directory:${NC}"
    echo "  - ssl/cert.pem (SSL certificate)"
    echo "  - ssl/key.pem (Private key)"
fi

# Docker deployment
echo "🐳 Starting Docker deployment..."

# Stop existing containers
echo "Stopping existing containers..."
docker-compose down 2>/dev/null || true

# Build Docker images
echo "Building Docker images..."
docker-compose build --no-cache

# Start services
echo "Starting services..."
docker-compose up -d

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 10

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}✓ Services are running${NC}"
else
    echo -e "${RED}Services failed to start. Check logs with: docker-compose logs${NC}"
    exit 1
fi

# Run database migrations
echo "🗄️ Running database migrations..."
docker-compose exec -T app npm run db:migrate || echo -e "${YELLOW}⚠ Migration failed or no migrations to run${NC}"

# Health check
echo "🏥 Performing health check..."
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Application is healthy${NC}"
else
    echo -e "${YELLOW}⚠ Health check failed. The application might still be starting...${NC}"
fi

# Display deployment information
echo ""
echo "════════════════════════════════════════════════"
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo "════════════════════════════════════════════════"
echo ""
echo "📊 Services Status:"
docker-compose ps
echo ""
echo "🔗 Access Points:"
echo "  - Application: http://localhost:3000"
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis: localhost:6379"
echo ""
echo "📝 Useful Commands:"
echo "  - View logs: docker-compose logs -f"
echo "  - Stop services: docker-compose down"
echo "  - Restart services: docker-compose restart"
echo "  - Enter app container: docker-compose exec app sh"
echo ""
echo "🔐 Next Steps:"
echo "  1. Configure your domain DNS to point to this server"
echo "  2. Add SSL certificates to ssl/ directory"
echo "  3. Update .env.production with your actual credentials"
echo "  4. Set up monitoring and backups"
echo ""
echo "For production deployment to taskmanagerai.honercloud.com:"
echo "  - Ensure Cloudflare tunnel is configured"
echo "  - Update NEXTAUTH_URL in .env.production"
echo "  - Configure OAuth providers with production URLs"
echo ""