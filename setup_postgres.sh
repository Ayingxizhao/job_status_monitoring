#!/bin/bash

# PostgreSQL Setup Script for Job Status API
# This script helps set up PostgreSQL for the project

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

echo -e "${BLUE}🐘 PostgreSQL Setup for Job Status API${NC}"
echo "================================================"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    print_error "PostgreSQL client not found. Please install PostgreSQL first."
    echo ""
    echo "Installation commands:"
    echo "  macOS: brew install postgresql"
    echo "  Ubuntu: sudo apt-get install postgresql-client"
    echo "  CentOS: sudo yum install postgresql"
    exit 1
fi

print_status "PostgreSQL client found"

# Check if PostgreSQL service is running
if ! pg_isready -h localhost -p 5432 &> /dev/null; then
    print_warn "PostgreSQL service not running or not accessible"
    echo ""
    echo "Start PostgreSQL service:"
    echo "  macOS: brew services start postgresql"
    echo "  Ubuntu: sudo systemctl start postgresql"
    echo "  CentOS: sudo systemctl start postgresql"
    exit 1
fi

print_status "PostgreSQL service is running"

# Create database and user
echo ""
print_info "Setting up database and user..."

# Create database if it doesn't exist
if ! psql -h localhost -U postgres -lqt | cut -d \| -f 1 | grep -qw job_status; then
    print_info "Creating database 'job_status'..."
    createdb -h localhost -U postgres job_status
    print_status "Database 'job_status' created"
else
    print_status "Database 'job_status' already exists"
fi

# Create test database if it doesn't exist
if ! psql -h localhost -U postgres -lqt | cut -d \| -f 1 | grep -qw job_status_test; then
    print_info "Creating test database 'job_status_test'..."
    createdb -h localhost -U postgres job_status_test
    print_status "Test database 'job_status_test' created"
else
    print_status "Test database 'job_status_test' already exists"
fi

echo ""
print_info "Setting up environment file..."

# Check if .env exists
if [ ! -f .env ]; then
    if [ -f env.example ]; then
        cp env.example .env
        print_status "Created .env from template"
    else
        print_error "env.example not found"
        exit 1
    fi
else
    print_status ".env file already exists"
fi

echo ""
print_info "PostgreSQL setup complete!"
echo ""
echo "Next steps:"
echo "1. Start the application: npm run dev"
echo "2. Check health: curl http://localhost:3000/health"
echo "3. View API docs: http://localhost:3000/api-docs"
echo ""
echo "Database connection details:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  Database: job_status"
echo "  User: postgres"
echo "  Password: (your PostgreSQL password)"
echo ""
echo "To reset the database:"
echo "  psql -U postgres -d job_status -c \"DROP SCHEMA public CASCADE; CREATE SCHEMA public;\""
