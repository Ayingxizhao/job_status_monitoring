const cron = require('node-cron');
const database = require('../config/database');
const redis = require('../config/redis');
const logger = require('../utils/logger');

class CleanupService {
  constructor() {
    this.isRunning = false;
    this.cleanupInterval = parseInt(process.env.CLEANUP_INTERVAL) || 3600000; // 1 hour default
  }

  /**
   * Start the cleanup service
   */
  start() {
    if (this.isRunning) {
      logger.warn('Cleanup service is already running');
      return;
    }

    // Schedule cleanup job
    cron.schedule('0 * * * *', () => { // Every hour at minute 0
      this.performCleanup();
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    // Schedule immediate cleanup for expired jobs
    cron.schedule('*/15 * * * *', () => { // Every 15 minutes
      this.cleanupExpiredJobs();
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    this.isRunning = true;
    logger.info('Cleanup service started');
  }

  /**
   * Stop the cleanup service
   */
  stop() {
    if (!this.isRunning) {
      logger.warn('Cleanup service is not running');
      return;
    }

    this.isRunning = false;
    logger.info('Cleanup service stopped');
  }

  /**
   * Perform comprehensive cleanup
   */
  async performCleanup() {
    if (this.isRunning === false) return;

    try {
      logger.info('Starting scheduled cleanup');
      
      // Cleanup expired jobs
      await this.cleanupExpiredJobs();
      
      // Cleanup old webhook deliveries
      await this.cleanupOldWebhookDeliveries();
      
      // Cleanup Redis cache
      await this.cleanupRedisCache();
      
      // Cleanup old logs (if implemented)
      await this.cleanupOldLogs();
      
      logger.info('Scheduled cleanup completed successfully');
    } catch (error) {
      logger.error('Cleanup service error:', error);
    }
  }

  /**
   * Cleanup jobs that have exceeded their TTL
   */
  async cleanupExpiredJobs() {
    try {
      const db = database.getConnection();
      const now = new Date();
      
      // Find expired jobs
      const expiredJobs = await db('jobs')
        .whereNotNull('ttl')
        .where('ttl', '>', 0)
        .whereRaw('created_at + INTERVAL \'1 millisecond\' * ttl < ?', [now])
        .select('id', 'name', 'status', 'created_at', 'ttl');
      
      if (expiredJobs.length === 0) {
        logger.debug('No expired jobs found');
        return;
      }
      
      // Delete expired jobs
      const jobIds = expiredJobs.map(job => job.id);
      const deletedCount = await db('jobs').whereIn('id', jobIds).del();
      
      // Clear Redis cache for deleted jobs
      for (const jobId of jobIds) {
        await redis.del(`job:${jobId}`);
      }
      
      logger.info(`Cleaned up ${deletedCount} expired jobs`, {
        expiredJobs: expiredJobs.map(job => ({
          id: job.id,
          name: job.name,
          status: job.status,
          age: Math.floor((now - new Date(job.created_at)) / 1000)
        }))
      });
    } catch (error) {
      logger.error('Failed to cleanup expired jobs:', error);
    }
  }

  /**
   * Cleanup old webhook delivery records
   */
  async cleanupOldWebhookDeliveries() {
    try {
      const db = database.getConnection();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Delete webhook deliveries older than 30 days
      const deletedCount = await db('webhook_deliveries')
        .where('created_at', '<', thirtyDaysAgo)
        .del();
      
      if (deletedCount > 0) {
        logger.info(`Cleaned up ${deletedCount} old webhook delivery records`);
      }
    } catch (error) {
      logger.error('Failed to cleanup old webhook deliveries:', error);
    }
  }

  /**
   * Cleanup Redis cache
   */
  async cleanupRedisCache() {
    try {
      // This is a simple cleanup - in production you might want more sophisticated cache management
      const client = redis.getClient();
      
      // Get all keys
      const keys = await client.keys('job:*');
      
      if (keys.length === 0) {
        return;
      }
      
      // Check if cached jobs still exist in database
      const db = database.getConnection();
      let cleanedCount = 0;
      
      for (const key of keys) {
        const jobId = key.replace('job:', '');
        
        try {
          const [job] = await db('jobs').where('id', jobId).select('id');
          if (!job) {
            // Job no longer exists, remove from cache
            await redis.del(key);
            cleanedCount++;
          }
        } catch (error) {
          // If we can't check the job, remove it from cache to be safe
          await redis.del(key);
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        logger.info(`Cleaned up ${cleanedCount} stale cache entries`);
      }
    } catch (error) {
      logger.error('Failed to cleanup Redis cache:', error);
    }
  }

  /**
   * Cleanup old log files
   */
  async cleanupOldLogs() {
    try {
      // This is a placeholder for log cleanup logic
      // In production, you might want to implement log rotation and cleanup
      logger.debug('Log cleanup not implemented');
    } catch (error) {
      logger.error('Failed to cleanup old logs:', error);
    }
  }

  /**
   * Manual cleanup trigger
   */
  async manualCleanup() {
    logger.info('Manual cleanup triggered');
    await this.performCleanup();
  }

  /**
   * Get cleanup statistics
   */
  async getCleanupStats() {
    try {
      const db = database.getConnection();
      const now = new Date();
      
      // Count jobs that will expire soon (next 24 hours)
      const expiringSoon = await db('jobs')
        .whereNotNull('ttl')
        .where('ttl', '>', 0)
        .whereRaw('created_at + INTERVAL \'1 millisecond\' * ttl < ?', [new Date(now.getTime() + 24 * 60 * 60 * 1000)])
        .count('* as count');
      
      // Count expired jobs
      const expired = await db('jobs')
        .whereNotNull('ttl')
        .where('ttl', '>', 0)
        .whereRaw('created_at + INTERVAL \'1 millisecond\' * ttl < ?', [now])
        .count('* as count');
      
      // Count old webhook deliveries
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const oldDeliveries = await db('webhook_deliveries')
        .where('created_at', '<', thirtyDaysAgo)
        .count('* as count');
      
      return {
        expiringSoon: parseInt(expiringSoon[0].count),
        expired: parseInt(expired[0].count),
        oldDeliveries: parseInt(oldDeliveries[0].count),
        lastCleanup: this.lastCleanupTime,
        isRunning: this.isRunning
      };
    } catch (error) {
      logger.error('Failed to get cleanup stats:', error);
      return null;
    }
  }
}

module.exports = new CleanupService();
