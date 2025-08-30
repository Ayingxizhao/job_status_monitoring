

-- 1. Create a clean database
DROP DATABASE IF EXISTS job_status_api;
CREATE DATABASE job_status_api;

-- 2. Create a dedicated user for your app
DROP USER IF EXISTS job_api_user;
CREATE USER job_api_user WITH PASSWORD 'secure_password_123';

-- 3. Grant permissions to the user
GRANT ALL PRIVILEGES ON DATABASE job_status_api TO job_api_user;

-- Now connect to the job_status_api database and create tables:
\c job_status_api;

-- 4. Grant schema permissions (needed for table creation)
GRANT ALL PRIVILEGES ON SCHEMA public TO job_api_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO job_api_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO job_api_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO job_api_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO job_api_user;

-- 5. Create the jobs table (main table for tracking job status)
CREATE TABLE IF NOT EXISTS jobs (
    id VARCHAR(36) PRIMARY KEY,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    job_type VARCHAR(100),
    payload JSONB,
    result JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- 6. Create webhooks table (for notifying other systems when jobs complete)
CREATE TABLE IF NOT EXISTS webhooks (
    id VARCHAR(36) PRIMARY KEY,
    url VARCHAR(500) NOT NULL,
    events TEXT[] NOT NULL,
    secret VARCHAR(100),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. Create webhook_deliveries table (tracks webhook notifications)
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id VARCHAR(36) PRIMARY KEY,
    webhook_id VARCHAR(36) REFERENCES webhooks(id),
    job_id VARCHAR(36) REFERENCES jobs(id),
    event_type VARCHAR(50) NOT NULL,
    payload TEXT NOT NULL,
    status_code INTEGER,
    response_body TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_job_id ON webhook_deliveries(job_id);

-- 9. Insert some sample data to test with
INSERT INTO jobs (id, status, job_type, payload) VALUES 
('job-001', 'pending', 'data_processing', '{"file": "data.csv", "rows": 1000}'),
('job-002', 'completed', 'email_send', '{"recipient": "user@example.com", "subject": "Welcome"}'),
('job-003', 'failed', 'image_resize', '{"image": "photo.jpg", "size": "thumbnail"}')
ON CONFLICT (id) DO NOTHING;

-- 10. Verify everything was created
SELECT 'Tables created successfully!' as status;
\dt;