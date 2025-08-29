# 🚀 Job Status API - Quick Reference Card

## 🚨 Emergency Troubleshooting

### 1. API Not Responding
```bash
# Check if server is running
ps aux | grep nodemon

# Check health
curl http://localhost:3000/health

# Check logs
tail -f logs/error.log

# Restart server
pkill -f nodemon
npm run dev
```

### 2. Database Issues
```bash
# Check database file
ls -la job_status.db

# Reset database (PostgreSQL)
psql -U postgres -d job_status -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
npm run dev

# Check database tables
psql -U postgres -d job_status -c "\dt"
```

### 3. Redis Issues
```bash
# Check Redis status
redis-cli ping

# Restart Redis
brew services restart redis

# Check Redis memory
redis-cli info memory
```

---

## 📋 Essential Commands

### Start/Stop
```bash
# Development mode
npm run dev

# Production mode
npm start

# Stop server
pkill -f nodemon
```

### Health Checks
```bash
# Basic health
curl http://localhost:3000/health

# Liveness
curl http://localhost:3000/health/live

# Readiness
curl http://localhost:3000/health/ready

# Metrics
curl http://localhost:3000/health/metrics
```

### Logs
```bash
# All logs
tail -f logs/combined.log

# Error logs only
tail -f logs/error.log

# Search for errors
grep "ERROR" logs/error.log
```

---

## 🧪 API Testing

### Jobs
```bash
# Create job
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "status": "pending"}'

# List jobs
curl http://localhost:3000/api/jobs

# Get job
curl http://localhost:3000/api/jobs/<id>

# Update job
curl -X PUT http://localhost:3000/api/jobs/<id> \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'

# Delete job
curl -X DELETE http://localhost:3000/api/jobs/<id>
```

### Tags
```bash
# List tags
curl http://localhost:3000/api/tags

# Jobs by tag
curl http://localhost:3000/api/tags/test/jobs
```

### Webhooks
```bash
# List webhooks
curl http://localhost:3000/api/webhooks

# Create webhook
curl -X POST http://localhost:3000/api/webhooks \
  -H "Content-Type: application/json" \
  -d '{"url": "https://webhook.site/url", "events": ["status_change"]}'
```

---

## 🔧 Configuration

### Environment Variables
```bash
# Copy template
cp env.example .env

# Edit configuration
nano .env

# Key settings
DB_TYPE=postgresql           # postgresql, mysql
REDIS_HOST=localhost        # Redis host
PORT=3000                   # API port
AUTH_ENABLED=false          # Set to true for production
```

### Database Types
```bash
# PostgreSQL (recommended)
DB_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=job_status
DB_USER=username
DB_PASSWORD=password

# MySQL
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=job_status
DB_USER=username
DB_PASSWORD=password
```

---

## 🐳 Docker Commands

### Build & Run
```bash
# Build image
docker build -t job-status-api .

# Run container
docker run -d --name job-status-api -p 3000:3000 job-status-api

# Docker Compose
docker-compose up -d
docker-compose down
```

### Container Management
```bash
# List containers
docker ps

# View logs
docker logs job-status-api

# Execute commands
docker exec -it job-status-api sh

# Stop container
docker stop job-status-api
```

---

## 📊 Monitoring

### System Status
```bash
# Check processes
ps aux | grep node

# Check ports
lsof -i :3000

# Check memory
ps aux | grep node | awk '{print $6}' | awk '{sum+=$1} END {print sum/1024 " MB"}'

# Check disk usage
du -sh job_status.db logs/
```

### Performance
```bash
# API response time
time curl http://localhost:3000/health

# Database size
psql -U postgres -d job_status -c "SELECT pg_size_pretty(pg_database_size('job_status'));"

# Log file sizes
ls -lh logs/*.log

# Redis memory
redis-cli info memory | grep used_memory_human
```

---

## 🚨 Common Error Messages

### Database Errors
```
POSTGRES_ERROR: column does not exist
→ Check migration files for PostgreSQL compatibility

POSTGRES_ERROR: relation already exists
→ Drop schema and restart

ECONNREFUSED: Redis connection
→ Start Redis service
```

### Network Errors
```
EADDRINUSE: port already in use
→ Change PORT in .env or kill conflicting process

ECONNREFUSED: database connection
→ Check database service status
```

### Application Errors
```
Cannot read properties of undefined
→ Check database query results

Validation failed
→ Check request payload format
```

---

## 🔍 Quick Diagnostics

### Run Full Diagnostics
```bash
./troubleshoot.sh
```

### Check Specific Issues
```bash
# Database
psql -U postgres -d job_status -c "\dt"

# Redis
redis-cli ping

# Network
curl -v http://localhost:3000/health

# Logs
tail -20 logs/error.log
```

---

## 📚 Documentation

### API Docs
- **Swagger UI**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/health
- **API Info**: http://localhost:3000/

### Files
- **Configuration**: `.env`
- **Logs**: `logs/` directory
- **Database**: PostgreSQL database
- **Migrations**: `src/migrations/`

---

## 🎯 Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| API not responding | `npm run dev` |
| Database errors | `psql -U postgres -d job_status -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" && npm run dev` |
| Redis errors | `brew services restart redis` |
| Port conflicts | Change `PORT` in `.env` |
| Permission errors | Check PostgreSQL user permissions |
| Log issues | `mkdir -p logs && chmod 755 logs` |

---

*Keep this card handy for quick troubleshooting! For detailed information, see `DEPLOYMENT_GUIDE.md`*
