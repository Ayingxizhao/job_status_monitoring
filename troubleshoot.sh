#!/bin/bash

# 🚨 Job Status API - Troubleshooting Script
# This script provides comprehensive system diagnostics

set -e

echo "🔍 Job Status API - System Diagnostics"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    local status=$1
    local message=$2
    if [ "$status" = "OK" ]; then
        echo -e "${GREEN}✅ $message${NC}"
    elif [ "$status" = "WARN" ]; then
        echo -e "${YELLOW}⚠️  $message${NC}"
    else
        echo -e "${RED}❌ $message${NC}"
    fi
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

echo -e "${BLUE}📋 System Information${NC}"
echo "OS: $(uname -s) $(uname -r)"
echo "Node.js: $(node --version 2>/dev/null || echo 'Not installed')"
echo "npm: $(npm --version 2>/dev/null || echo 'Not installed')"
echo ""

echo -e "${BLUE}🔧 Prerequisites Check${NC}"

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 16 ]; then
        print_status "OK" "Node.js $(node --version) - Version OK"
    else
        print_status "WARN" "Node.js $(node --version) - Version < 16, may cause issues"
    fi
else
    print_status "ERROR" "Node.js not installed"
fi

# Check npm
if command_exists npm; then
    print_status "OK" "npm $(npm --version) - Installed"
else
    print_status "ERROR" "npm not installed"
fi

# Check Git
if command_exists git; then
    print_status "OK" "Git $(git --version | cut -d' ' -f3) - Installed"
else
    print_status "WARN" "Git not installed (optional for deployment)"
fi

# Check Docker
if command_exists docker; then
    print_status "OK" "Docker $(docker --version | cut -d' ' -f3 | cut -d',' -f1) - Installed"
else
    print_status "WARN" "Docker not installed (optional for containerized deployment)"
fi

echo ""

echo -e "${BLUE}📁 Project Structure Check${NC}"

# Check if we're in the right directory
if [ -f "package.json" ]; then
    print_status "OK" "package.json found - Correct directory"
else
    print_status "ERROR" "package.json not found - Wrong directory"
    exit 1
fi

# Check key files
if [ -f "src/server.js" ]; then
    print_status "OK" "Server file found"
else
    print_status "ERROR" "Server file missing"
fi

if [ -f ".env" ]; then
    print_status "OK" "Environment file found"
else
    print_status "WARN" "Environment file missing - copy from env.example"
fi

if [ -d "node_modules" ]; then
    print_status "OK" "Dependencies installed"
else
    print_status "WARN" "Dependencies not installed - run 'npm install'"
fi

echo ""

echo -e "${BLUE}🗄️  Database Check${NC}"

# Check environment configuration
if [ -f ".env" ]; then
    DB_TYPE=$(grep "^DB_TYPE=" .env | cut -d'=' -f2 || echo "not_set")
    echo "Database Type: $DB_TYPE"
    
    case $DB_TYPE in

        "postgresql")
            if command_exists psql; then
                print_status "OK" "PostgreSQL client available"
            else
                print_status "WARN" "PostgreSQL client not installed"
            fi
            ;;
        "mysql")
            if command_exists mysql; then
                print_status "OK" "MySQL client available"
            else
                print_status "WARN" "MySQL client not installed"
            fi
            ;;
        *)
            print_status "WARN" "Database type not configured or invalid"
            ;;
    esac
fi

echo ""

echo -e "${BLUE}🔴 Redis Check${NC}"

# Check Redis
if command_exists redis-cli; then
    if redis-cli ping >/dev/null 2>&1; then
        print_status "OK" "Redis is running and responding"
        REDIS_VERSION=$(redis-cli info server | grep redis_version | cut -d: -f2)
        echo "Redis version: $REDIS_VERSION"
    else
        print_status "WARN" "Redis client available but server not responding"
    fi
else
    print_status "WARN" "Redis client not installed"
fi

echo ""

echo -e "${BLUE}🌐 Network Check${NC}"

# Check if port 3000 is available
if lsof -i :3000 >/dev/null 2>&1; then
    PORT_PROCESS=$(lsof -i :3000 | grep LISTEN | awk '{print $1}')
    print_status "WARN" "Port 3000 is in use by: $PORT_PROCESS"
else
    print_status "OK" "Port 3000 is available"
fi

echo ""

echo -e "${BLUE}📊 Process Check${NC}"

# Check Node.js processes
NODE_PROCESSES=$(ps aux | grep -E "(node|nodemon)" | grep -v grep | wc -l)
if [ "$NODE_PROCESSES" -gt 0 ]; then
    print_status "OK" "Node.js processes running: $NODE_PROCESSES"
    ps aux | grep -E "(node|nodemon)" | grep -v grep | awk '{print "  PID: " $2 " - " $11}'
else
    print_status "WARN" "No Node.js processes running"
fi

echo ""

echo -e "${BLUE}📝 Log Check${NC}"

# Check log files
if [ -d "logs" ]; then
    print_status "OK" "Log directory exists"
    
    if [ -f "logs/combined.log" ]; then
        LOG_SIZE=$(ls -lh logs/combined.log | awk '{print $5}')
        print_status "OK" "Combined log: $LOG_SIZE"
    else
        print_status "WARN" "Combined log not found"
    fi
    
    if [ -f "logs/error.log" ]; then
        ERROR_COUNT=$(grep -c "ERROR" logs/error.log 2>/dev/null || echo "0")
        if [ "$ERROR_COUNT" -gt 0 ]; then
            print_status "WARN" "Error log: $ERROR_COUNT errors found"
        else
            print_status "OK" "Error log: No errors found"
        fi
    else
        print_status "WARN" "Error log not found"
    fi
else
    print_status "WARN" "Log directory not found"
fi

echo ""

echo -e "${BLUE}🧪 API Health Check${NC}"

# Try to connect to the API
if curl -s http://localhost:3000/health >/dev/null 2>&1; then
    print_status "OK" "API is responding on port 3000"
    
    # Get detailed health info
    HEALTH_RESPONSE=$(curl -s http://localhost:3000/health)
    if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
        print_status "OK" "API health check passed"
    else
        print_status "WARN" "API health check failed"
        echo "Response: $HEALTH_RESPONSE"
    fi
else
    print_status "ERROR" "API not responding on port 3000"
fi

echo ""

echo -e "${BLUE}🔧 Quick Fixes${NC}"

# Suggest fixes based on issues found
if [ ! -d "node_modules" ]; then
    echo "💡 Run: npm install"
fi

if [ ! -f ".env" ]; then
    echo "💡 Run: cp env.example .env"
fi

if ! command_exists redis-cli; then
    echo "💡 Install Redis: brew install redis (macOS) or sudo apt-get install redis-server (Ubuntu)"
fi

if [ "$NODE_PROCESSES" -eq 0 ]; then
    echo "💡 Start API: npm run dev"
fi

if lsof -i :3000 >/dev/null 2>&1; then
    echo "💡 Port 3000 conflict: Change PORT in .env or kill conflicting process"
fi

echo ""

echo -e "${BLUE}📚 Useful Commands${NC}"
echo "Start API: npm run dev"
echo "Check logs: tail -f logs/combined.log"
echo "Check errors: tail -f logs/error.log"
echo "Health check: curl http://localhost:3000/health"
echo "API docs: curl http://localhost:3000/api-docs"
echo ""

echo -e "${BLUE}🎯 Next Steps${NC}"
echo "1. Fix any ERROR issues above"
echo "2. Address WARN issues for optimal performance"
echo "3. Run 'npm run dev' to start the API"
echo "4. Test with: curl http://localhost:3000/health"
echo "5. Check logs for detailed error information"
echo ""

echo "🔍 Diagnostics complete!"
