# Job Status API

A dedicated, lightweight, database-agnostic job status API that fills the gap between simple key-value storage and complex workflow engines.

## Core Features

- **Webhook notifications** when job status changes
- **Bulk operations** for handling multiple jobs
- **Job categorization/tagging system**
- **Configurable TTL** for automatic cleanup of old jobs
- **Query filtering** (by status, date range, tags)

## 🚀 Quick Start

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd job-status-api
   npm install
   ```

2. **Environment setup:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the server:**
   ```bash
   npm run dev
   ```

4. **Access the API:**
   - API: http://localhost:3000/api
   - Documentation: http://localhost:3000/api-docs

## 🔧 Configuration

The API supports multiple database backends. Configure your preferred database in `.env`:

```env
# Database Configuration
DB_TYPE=postgresql  # Options: postgresql, mysql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=job_status
DB_USER=username
DB_PASSWORD=password

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# API Configuration
PORT=3000
NODE_ENV=development
JWT_SECRET=your-secret-key
WEBHOOK_TIMEOUT=5000
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
```

## 📚 API Endpoints

### Jobs
- `POST /api/jobs` - Create a new job
- `GET /api/jobs` - List jobs with filtering
- `GET /api/jobs/:id` - Get job details
- `PUT /api/jobs/:id` - Update job
- `DELETE /api/jobs/:id` - Delete job
- `POST /api/jobs/bulk` - Bulk operations

### Webhooks
- `POST /api/webhooks` - Register webhook
- `GET /api/webhooks` - List webhooks
- `DELETE /api/webhooks/:id` - Remove webhook

### Tags
- `GET /api/tags` - List all tags
- `GET /api/tags/:tag/jobs` - Get jobs by tag


## 🧪 Testing

```bash
npm test
npm run test:watch
```
