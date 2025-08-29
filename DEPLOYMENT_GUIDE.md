# 🚀 Job Status API - Complete Deployment & Troubleshooting Guide

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Step-by-Step Deployment](#step-by-step-deployment)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup](#database-setup)
6. [Redis Setup](#redis-setup)
7. [Production Deployment](#production-deployment)
8. [Monitoring & Troubleshooting](#monitoring--troubleshooting)
9. [Common Issues & Solutions](#common-issues--solutions)
10. [API Testing](#api-testing)
11. [Performance Tuning](#performance-tuning)
12. [Security Considerations](#security-considerations)

---

## 🔧 Prerequisites

### Required Software
- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Git**
- **Docker** (optional, for containerized deployment)
- **PostgreSQL** (optional, for production)
- **Redis** (optional, for caching)

### System Requirements
- **RAM**: Minimum 512MB, Recommended 2GB+
- **Storage**: Minimum 1GB free space
- **Network**: Port 3000 available (configurable)

---

## ⚡ Quick Start

```bash
# Clone and setup
git clone <your-repo>
cd job_status
npm install

# Start with PostgreSQL (recommended)
cp env.example .env
npm run dev

# Test the API
curl http://localhost:3000/health
```

---

## 📦 Step-by-Step Deployment

### 1. Project Setup

```bash
# Navigate to project directory
cd /path/to/job_status

# Install dependencies
npm install

# Verify installation
npm run test
```

### 2. Environment Configuration

```bash
# Copy environment template
cp env.example .env

# Edit configuration
nano .env
```

**Key Environment Variables:**
```env
# Database Configuration
DB_TYPE=postgresql                # postgresql, mysql
DB_HOST=localhost                 # For PostgreSQL/MySQL
DB_PORT=5432                      # For PostgreSQL/MySQL
DB_USER=postgres                  # For PostgreSQL/MySQL
DB_PASSWORD=postgres              # For PostgreSQL/MySQL

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# API Configuration
PORT=3000
NODE_ENV=development
JWT_SECRET=your-super-secret-key
AUTH_ENABLED=false                # Set to true for production
```

### 3. Database Setup

#### Option A: PostgreSQL (Recommended)
```bash
# Install PostgreSQL
brew install postgresql          # macOS
sudo apt-get install postgresql # Ubuntu

# Start PostgreSQL
brew services start postgresql   # macOS
sudo systemctl start postgresql # Ubuntu

# Create database
createdb job_status
createdb_user -P job_user       # Set password when prompted

# Update .env file
DB_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=job_status
DB_USER=job_user
DB_PASSWORD=your_password
```

#### Option C: MySQL (Production)
```bash
# Install MySQL
brew install mysql               # macOS
sudo apt-get install mysql-server # Ubuntu

# Start MySQL
brew services start mysql        # macOS
sudo systemctl start mysql      # Ubuntu

# Create database
mysql -u root -p
CREATE DATABASE job_status;
CREATE USER 'job_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON job_status.* TO 'job_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Update .env file
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=job_status
DB_USER=job_user
DB_PASSWORD=your_password
```

### 4. Redis Setup

#### Option A: Local Redis
```bash
# Install Redis
brew install redis               # macOS
sudo apt-get install redis-server # Ubuntu

# Start Redis
brew services start redis        # macOS
sudo systemctl start redis      # Ubuntu

# Test Redis
redis-cli ping                  # Should return PONG
```

#### Option B: Docker Redis
```bash
# Start Redis container
docker run -d --name redis \
  -p 6379:6379 \
  redis:alpine

# Test connection
docker exec redis redis-cli ping
```

### 5. Start the Application

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start

# Check if running
curl http://localhost:3000/health
```

---

## 🐳 Docker Deployment

### 1. Build Docker Image
```bash
# Build the image
docker build -t job-status-api .

# Verify image
docker images | grep job-status-api
```

### 2. Run with Docker Compose
```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f api
```

### 3. Standalone Docker
```bash
# Run API container
docker run -d \
  --name job-status-api \
  -p 3000:3000 \
  -v $(pwd)/.env:/app/.env \
  job-status-api

# Check container
docker ps | grep job-status-api
```

---

## 🔍 Monitoring & Troubleshooting

### 1. Health Checks

#### Basic Health
```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-08-28T02:05:45.732Z",
  "uptime": 8.430396792,
  "version": "1.0.0",
  "environment": "development",
  "checks": {
    "database": {
      "status": "healthy",
      "message": "Database connection successful"
    },
    "redis": {
      "status": "healthy",
      "message": "Redis connection successful"
    },
    "memory": {
      "status": "healthy",
      "message": "Memory usage normal"
    }
  }
}
```

#### Detailed Health Checks
```bash
# Liveness check
curl http://localhost:3000/health/live

# Readiness check
curl http://localhost:3000/health/ready

# Metrics
curl http://localhost:3000/health/metrics
```

### 2. Log Monitoring

#### View Logs
```bash
# Application logs
tail -f logs/combined.log

# Error logs
tail -f logs/error.log

# Real-time monitoring
tail -f logs/*.log | grep -E "(ERROR|WARN|FATAL)"
```

#### Log Levels
- **ERROR**: Critical issues requiring immediate attention
- **WARN**: Potential issues that should be monitored
- **INFO**: General application flow information
- **DEBUG**: Detailed debugging information

### 3. Process Monitoring

#### Check Running Processes
```bash
# Node.js processes
ps aux | grep node | grep -v grep

# Nodemon processes
ps aux | grep nodemon | grep -v grep

# Port usage
lsof -i :3000
netstat -tulpn | grep :3000
```

#### Resource Usage
```bash
# Memory usage
ps aux | grep node | awk '{print $6}' | awk '{sum+=$1} END {print "Total Memory: " sum/1024 " MB"}'

# CPU usage
top -p $(pgrep -f "node.*server.js")
```

---

## 🚨 Common Issues & Solutions

### 1. Database Connection Issues



#### PostgreSQL Issues
```bash
# Check service status
brew services list | grep postgresql
sudo systemctl status postgresql

# Check connection
psql -h localhost -U job_user -d job_status

# Reset connection
brew services restart postgresql
sudo systemctl restart postgresql
```

#### MySQL Issues
```bash
# Check service status
brew services list | grep mysql
sudo systemctl status mysql

# Check connection
mysql -u job_user -p -h localhost job_status

# Reset connection
brew services restart mysql
sudo systemctl restart mysql
```

### 2. Redis Connection Issues

#### Connection Refused
```bash
# Check Redis status
brew services list | grep redis
sudo systemctl status redis

# Test connection
redis-cli ping

# Check port
lsof -i :6379

# Restart Redis
brew services restart redis
sudo systemctl restart redis
```

#### Authentication Issues
```bash
# Check Redis config
cat /opt/homebrew/etc/redis.conf | grep requirepass

# Test with password
redis-cli -a your_password ping

# Update .env file
REDIS_PASSWORD=your_password
```

### 3. Port Conflicts

#### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=3001
```

### 4. Permission Issues

#### File Permissions
```bash
# Fix log directory permissions
mkdir -p logs
chmod 755 logs
chmod 644 logs/*.log

# Fix database permissions
chmod 644 job_status.db
```

#### Node Modules Issues
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### 5. Migration Issues

#### Table Already Exists
```bash
# Check migration status
npx knex migrate:status

# Reset migrations
npx knex migrate:rollback --all

# Run migrations
npx knex migrate:latest
```

#### Migration Failed
```bash
# Check error logs
tail -f logs/error.log

# Fix migration files
# Ensure PostgreSQL compatibility for all queries

# Reset and retry
psql -U postgres -d job_status -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
npm run dev
```

---

## 🧪 API Testing

### 1. Basic Endpoints

#### Health Check
```bash
curl http://localhost:3000/health
curl http://localhost:3000/health/live
curl http://localhost:3000/health/ready
```

#### API Info
```bash
curl http://localhost:3000/
curl http://localhost:3000/api-docs
```

### 2. Job Management

#### Create Job
```bash
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Job",
    "description": "A test job",
    "status": "pending",
    "tags": ["test", "demo"]
  }'
```

#### List Jobs
```bash
# Get all jobs
curl http://localhost:3000/api/jobs

# Filter by status
curl "http://localhost:3000/api/jobs?status=running"

# Filter by tags
curl "http://localhost:3000/api/jobs?tags=test"

# Pagination
curl "http://localhost:3000/api/jobs?limit=10&offset=0"
```

#### Get Job Details
```bash
curl http://localhost:3000/api/jobs/<job-id>
```

#### Update Job
```bash
curl -X PUT http://localhost:3000/api/jobs/<job-id> \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed",
    "progress": 100
  }'
```

#### Delete Job
```bash
curl -X DELETE http://localhost:3000/api/jobs/<job-id>
```

### 3. Tag Management

#### List Tags
```bash
curl http://localhost:3000/api/tags
```

#### Get Jobs by Tag
```bash
curl http://localhost:3000/api/tags/test/jobs
```

### 4. Webhook Management

#### List Webhooks
```bash
curl http://localhost:3000/api/webhooks
```

#### Create Webhook
```bash
curl -X POST http://localhost:3000/api/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://webhook.site/your-unique-url",
    "events": ["status_change", "job_created"]
  }'
```

### 5. Bulk Operations

#### Bulk Update
```bash
curl -X POST http://localhost:3000/api/jobs/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "update",
    "filters": {"status": "pending"},
    "updates": {"status": "running"}
  }'
```

#### Bulk Delete
```bash
curl -X POST http://localhost:3000/api/jobs/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "delete",
    "filters": {"status": "completed", "created_at": "< 2024-01-01"}
  }'
```

---

## ⚡ Performance Tuning

### 1. Database Optimization



#### PostgreSQL
```sql
-- Create indexes for better performance
CREATE INDEX CONCURRENTLY idx_jobs_status ON jobs(status);
CREATE INDEX CONCURRENTLY idx_jobs_created_at ON jobs(created_at);
CREATE INDEX CONCURRENTLY idx_jobs_tags ON jobs USING GIN(tags);

-- Analyze tables
ANALYZE jobs;
ANALYZE webhooks;
```

### 2. Redis Optimization

#### Memory Management
```bash
# Check Redis memory usage
redis-cli info memory

# Set memory limits
redis-cli config set maxmemory 256mb
redis-cli config set maxmemory-policy allkeys-lru
```

#### Connection Pooling
```env
# In .env file
REDIS_MAX_CLIENTS=50
REDIS_RETRY_DELAY=1000
```

### 3. Application Optimization

#### Node.js Tuning
```bash
# Increase memory limit
NODE_OPTIONS="--max-old-space-size=2048" npm start

# Enable clustering
npm install pm2
pm2 start src/server.js -i max
```

#### Rate Limiting
```env
# Adjust rate limits in .env
RATE_LIMIT_WINDOW=900000    # 15 minutes
RATE_LIMIT_MAX=1000         # 1000 requests per window
```

---

## 🔒 Security Considerations

### 1. Authentication

#### Enable Authentication
```env
# In .env file
AUTH_ENABLED=true
BASIC_AUTH_USERNAME=admin
BASIC_AUTH_PASSWORD=secure_password
JWT_SECRET=very_long_random_secret_key
```

#### JWT Configuration
```env
# JWT settings
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
```

### 2. Network Security

#### Firewall Configuration
```bash
# Allow only necessary ports
sudo ufw allow 3000/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

#### Reverse Proxy (Nginx)
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 3. Data Security

#### Database Security
```sql
-- PostgreSQL: Create read-only user
CREATE USER readonly_user WITH PASSWORD 'password';
GRANT CONNECT ON DATABASE job_status TO readonly_user;
GRANT USAGE ON SCHEMA public TO readonly_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;
```

#### Environment Security
```bash
# Secure .env file
chmod 600 .env

# Use secrets management
export $(cat .env | xargs)
```

---

## 📊 Monitoring & Alerting

### 1. Application Metrics

#### Built-in Metrics
```bash
# Get application metrics
curl http://localhost:3000/health/metrics

# Monitor specific endpoints
curl http://localhost:3000/health/metrics/jobs
curl http://localhost:3000/health/metrics/webhooks
```

#### Custom Monitoring
```bash
# Monitor log files
tail -f logs/combined.log | grep -E "(ERROR|WARN)"

# Monitor database size
ls -lh job_status.db

# Monitor Redis memory
redis-cli info memory | grep used_memory_human
```

### 2. System Monitoring

#### Process Monitoring
```bash
# Check if process is running
pgrep -f "node.*server.js" || echo "Process not running"

# Monitor resource usage
top -p $(pgrep -f "node.*server.js")
```

#### Log Monitoring
```bash
# Monitor error rates
grep -c "ERROR" logs/error.log

# Monitor response times
grep "response_time" logs/combined.log | awk '{print $NF}'
```

---

## 🚀 Production Deployment Checklist

### Pre-Deployment
- [ ] Environment variables configured
- [ ] Database migrations tested
- [ ] Redis connection verified
- [ ] Authentication enabled
- [ ] Rate limiting configured
- [ ] Logging configured
- [ ] Health checks working

### Deployment
- [ ] Use PM2 or similar process manager
- [ ] Set up reverse proxy (Nginx)
- [ ] Configure SSL certificates
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Set up alerting

### Post-Deployment
- [ ] Verify all endpoints
- [ ] Test webhook delivery
- [ ] Monitor performance
- [ ] Check error logs
- [ ] Verify database connections
- [ ] Test authentication

---

## 📚 Additional Resources

### Documentation
- [API Documentation](http://localhost:3000/api-docs)
- [Health Endpoints](http://localhost:3000/health)
- [Swagger UI](http://localhost:3000/api-docs)

### Support
- Check logs in `logs/` directory
- Review error messages in `logs/error.log`
- Monitor application health at `/health`
- Use API documentation at `/api-docs`

### Troubleshooting Commands
```bash
# Quick health check
curl -s http://localhost:3000/health | jq .

# Check logs
tail -f logs/combined.log

# Check processes
ps aux | grep node

# Check ports
lsof -i :3000

# Check database
psql -U postgres -d job_status -c "\dt"

# Check Redis
redis-cli ping
```

---

## 🎯 Quick Troubleshooting Flow

1. **Check if server is running**: `curl http://localhost:3000/health`
2. **Check logs**: `tail -f logs/error.log`
3. **Check processes**: `ps aux | grep node`
4. **Check ports**: `lsof -i :3000`
5. **Check database**: `psql -U postgres -d job_status -c "\dt"`
6. **Check Redis**: `redis-cli ping`
7. **Restart if needed**: `npm run dev`

---

*This guide covers the complete deployment and troubleshooting process for your Job Status API. For additional support, check the logs and use the built-in health monitoring endpoints.*
