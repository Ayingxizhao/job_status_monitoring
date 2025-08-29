const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Job Status API',
      version: '1.0.0',
      description: 'A dedicated, lightweight, database-agnostic job status API with webhooks, bulk operations, and caching',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        basicAuth: {
          type: 'http',
          scheme: 'basic'
        }
      },
      schemas: {
        Job: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique job identifier'
            },
            name: {
              type: 'string',
              description: 'Job name'
            },
            description: {
              type: 'string',
              description: 'Job description'
            },
            status: {
              type: 'string',
              enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
              description: 'Current job status'
            },
            progress: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              description: 'Job progress percentage'
            },
            tags: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Job tags for categorization'
            },
            metadata: {
              type: 'object',
              description: 'Additional job metadata'
            },
            ttl: {
              type: 'number',
              description: 'Time to live in milliseconds'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Job creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            },
            completedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Job completion timestamp'
            }
          },
          required: ['name', 'status']
        },
        Webhook: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique webhook identifier'
            },
            url: {
              type: 'string',
              format: 'uri',
              description: 'Webhook endpoint URL'
            },
            events: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['status_change', 'progress_update', 'completion', 'failure']
              },
              description: 'Events to trigger webhook'
            },
            headers: {
              type: 'object',
              description: 'Custom headers for webhook requests'
            },
            isActive: {
              type: 'boolean',
              description: 'Whether webhook is active'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            }
          },
          required: ['url', 'events']
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            },
            code: {
              type: 'string',
              description: 'Error code'
            },
            details: {
              type: 'object',
              description: 'Additional error details'
            }
          }
        }
      }
    },
    security: [
      {
        basicAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.js']
};

module.exports = {
  swaggerOptions
};
