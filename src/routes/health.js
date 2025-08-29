const express = require('express');
const database = require('../config/database');
const redis = require('../config/redis');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API is healthy
 *       503:
 *         description: API is unhealthy
 */
router.get('/', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {}
    };

    // Database health check
    try {
      const db = database.getConnection();
      await db.raw('SELECT 1');
      health.checks.database = {
        status: 'healthy',
        message: 'Database connection successful'
      };
    } catch (error) {
      health.checks.database = {
        status: 'unhealthy',
        message: error.message
      };
      health.status = 'unhealthy';
    }

    // Redis health check
    try {
      await redis.get('health-check');
      health.checks.redis = {
        status: 'healthy',
        message: 'Redis connection successful'
      };
    } catch (error) {
      health.checks.redis = {
        status: 'unhealthy',
        message: error.message
      };
      health.status = 'unhealthy';
    }

    // Memory usage
    const memUsage = process.memoryUsage();
    health.checks.memory = {
      status: 'healthy',
      message: 'Memory usage normal',
      details: {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024)} MB`
      }
    };

    // CPU usage
    const startUsage = process.cpuUsage();
    health.checks.cpu = {
      status: 'healthy',
      message: 'CPU usage normal',
      details: {
        user: `${Math.round(startUsage.user / 1000)} ms`,
        system: `${Math.round(startUsage.system / 1000)} ms`
      }
    };

    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    if (health.status === 'unhealthy') {
      logger.warn('Health check failed', health);
    } else {
      logger.debug('Health check passed', health);
    }

    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /health/ready:
 *   get:
 *     summary: Readiness check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API is ready to serve requests
 *       503:
 *         description: API is not ready
 */
router.get('/ready', async (req, res) => {
  try {
    const checks = {};

    // Database readiness
    try {
      const db = database.getConnection();
      await db.raw('SELECT 1');
      checks.database = { status: 'ready' };
    } catch (error) {
      checks.database = { status: 'not_ready', error: error.message };
    }

    // Redis readiness
    try {
      await redis.get('health-check');
      checks.redis = { status: 'ready' };
    } catch (error) {
      checks.redis = { status: 'not_ready', error: error.message };
    }

    const allReady = Object.values(checks).every(check => check.status === 'ready');
    const statusCode = allReady ? 200 : 503;

    res.status(statusCode).json({
      status: allReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks
    });
  } catch (error) {
    logger.error('Readiness check error:', error);
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: 'Readiness check failed'
    });
  }
});

/**
 * @swagger
 * /health/live:
 *   get:
 *     summary: Liveness check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API is alive
 */
router.get('/live', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * @swagger
 * /health/metrics:
 *   get:
 *     summary: Metrics endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const db = database.getConnection();
    
    // Get job statistics
    const jobStats = await db('jobs')
      .select('status')
      .count('* as count')
      .groupBy('status');
    
    const statusCounts = {};
    jobStats.forEach(stat => {
      statusCounts[stat.status] = parseInt(stat.count);
    });
    
    // Get webhook statistics
    const [{ totalWebhooks }] = await db('webhooks')
      .count('* as total');
    
    const [{ activeWebhooks }] = await db('webhooks')
      .where('is_active', true)
      .count('* as total');
    
    // Get tag statistics
    const [{ uniqueTags }] = await db.raw(`
      SELECT COUNT(DISTINCT jsonb_array_elements_text(tags)) as total
      FROM jobs 
      WHERE tags IS NOT NULL AND jsonb_array_length(tags) > 0
    `);
    
    const metrics = {
      timestamp: new Date().toISOString(),
      jobs: {
        total: Object.values(statusCounts).reduce((a, b) => a + b, 0),
        byStatus: statusCounts
      },
      webhooks: {
        total: parseInt(totalWebhooks),
        active: parseInt(activeWebhooks)
      },
      tags: {
        unique: parseInt(uniqueTags)
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform
      }
    };
    
    res.json(metrics);
  } catch (error) {
    logger.error('Metrics collection error:', error);
    res.status(500).json({
      error: 'Failed to collect metrics',
      message: error.message
    });
  }
});

module.exports = router;
