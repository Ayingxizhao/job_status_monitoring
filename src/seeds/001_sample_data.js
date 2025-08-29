/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('webhook_deliveries').del();
  await knex('webhooks').del();
  await knex('jobs').del();

  // Inserts sample jobs
  await knex('jobs').insert([
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Data Processing Pipeline',
      description: 'Process customer data for analytics',
      status: 'completed',
      progress: 100,
      tags: ['data-processing', 'analytics', 'batch'],
      metadata: {
        priority: 'high',
        department: 'engineering',
        estimatedDuration: '2 hours'
      },
      ttl: 86400000, // 24 hours
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      completed_at: new Date(Date.now() - 1 * 60 * 60 * 1000)
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      name: 'Email Campaign Generation',
      description: 'Generate personalized email campaigns',
      status: 'running',
      progress: 65,
      tags: ['email', 'marketing', 'personalization'],
      metadata: {
        priority: 'medium',
        department: 'marketing',
        targetAudience: 'premium-users'
      },
      ttl: 172800000, // 48 hours
      created_at: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      updated_at: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440003',
      name: 'Database Backup',
      description: 'Create full database backup',
      status: 'pending',
      progress: 0,
      tags: ['backup', 'maintenance', 'database'],
      metadata: {
        priority: 'low',
        department: 'operations',
        backupType: 'full',
        retentionDays: 30
      },
      ttl: 3600000, // 1 hour
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440004',
      name: 'API Rate Limit Monitoring',
      description: 'Monitor and adjust API rate limits',
      status: 'failed',
      progress: 45,
      tags: ['monitoring', 'api', 'rate-limiting'],
      metadata: {
        priority: 'high',
        department: 'engineering',
        errorCode: 'RATE_LIMIT_EXCEEDED'
      },
      ttl: 7200000, // 2 hours
      error: 'Rate limit exceeded during monitoring check',
      created_at: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
      updated_at: new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440005',
      name: 'User Authentication Sync',
      description: 'Synchronize user authentication across services',
      status: 'cancelled',
      progress: 20,
      tags: ['authentication', 'sync', 'security'],
      metadata: {
        priority: 'medium',
        department: 'security',
        reason: 'Maintenance window'
      },
      ttl: 1800000, // 30 minutes
      created_at: new Date(Date.now() - 20 * 60 * 1000), // 20 minutes ago
      updated_at: new Date(Date.now() - 15 * 60 * 1000) // 15 minutes ago
    }
  ]);

  // Inserts sample webhooks
  await knex('webhooks').insert([
    {
      id: '660e8400-e29b-41d4-a716-446655440001',
      url: 'https://webhook.site/abc123',
      events: ['status_change', 'completion'],
      headers: {
        'X-API-Key': 'sample-key-123',
        'X-Source': 'job-status-api'
      },
      is_active: true,
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      updated_at: new Date(Date.now() - 24 * 60 * 60 * 1000)
    },
    {
      id: '660e8400-e29b-41d4-a716-446655440002',
      url: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX',
      events: ['status_change', 'failure'],
      headers: {
        'Content-Type': 'application/json'
      },
      is_active: true,
      created_at: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
      updated_at: new Date(Date.now() - 12 * 60 * 60 * 1000)
    },
    {
      id: '660e8400-e29b-41d4-a716-446655440003',
      url: 'https://api.example.com/webhooks/job-status',
      events: ['progress_update', 'completion'],
      headers: {
        'Authorization': 'Bearer sample-token-456',
        'X-Webhook-ID': 'internal-001'
      },
      is_active: false,
      created_at: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hour ago
    }
  ]);

  // Inserts sample webhook deliveries
  await knex('webhook_deliveries').insert([
    {
      id: '770e8400-e29b-41d4-a716-446655440001',
      webhook_id: '660e8400-e29b-41d4-a716-446655440001',
      job_id: '550e8400-e29b-41d4-a716-446655440001',
      event_type: 'completion',
      payload: {
        event: 'completion',
        timestamp: new Date().toISOString(),
        job: {
          id: '550e8400-e29b-41d4-a716-446655440001',
          name: 'Data Processing Pipeline',
          status: 'completed'
        }
      },
      status_code: 200,
      response_body: 'OK',
      delivered_at: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      created_at: new Date(Date.now() - 30 * 60 * 1000)
    },
    {
      id: '770e8400-e29b-41d4-a716-446655440002',
      webhook_id: '660e8400-e29b-41d4-a716-446655440002',
      job_id: '550e8400-e29b-41d4-a716-446655440004',
      event_type: 'status_change',
      payload: {
        event: 'status_change',
        timestamp: new Date().toISOString(),
        job: {
          id: '550e8400-e29b-41d4-a716-446655440004',
          name: 'API Rate Limit Monitoring',
          status: 'failed'
        }
      },
      status_code: 200,
      response_body: 'OK',
      delivered_at: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
      created_at: new Date(Date.now() - 10 * 60 * 1000)
    }
  ]);
};
