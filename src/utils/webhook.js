const axios = require('axios');
const logger = require('./logger');

class WebhookManager {
  constructor() {
    this.maxRetries = parseInt(process.env.MAX_WEBHOOK_RETRIES) || 3;
    this.timeout = parseInt(process.env.WEBHOOK_TIMEOUT) || 5000;
    this.batchSize = parseInt(process.env.WEBHOOK_BATCH_SIZE) || 10;
  }

  /**
   * Send webhook notification
   * @param {string} url - Webhook URL
   * @param {Object} payload - Webhook payload
   * @param {Object} headers - Custom headers
   * @param {number} retryCount - Current retry attempt
   * @returns {Promise<boolean>} - Success status
   */
  async sendWebhook(url, payload, headers = {}, retryCount = 0) {
    try {
      const config = {
        method: 'POST',
        url,
        data: payload,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Job-Status-API/1.0.0',
          ...headers
        },
        timeout: this.timeout
      };

      const response = await axios(config);
      
      if (response.status >= 200 && response.status < 300) {
        logger.info(`Webhook sent successfully to ${url}`, {
          status: response.status,
          jobId: payload.job?.id
        });
        return true;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      logger.error(`Webhook failed to ${url}`, {
        error: error.message,
        jobId: payload.job?.id,
        retryCount
      });

      // Retry logic
      if (retryCount < this.maxRetries && this.shouldRetry(error)) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        logger.info(`Retrying webhook to ${url} in ${delay}ms (attempt ${retryCount + 1})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.sendWebhook(url, payload, headers, retryCount + 1);
      }

      return false;
    }
  }

  /**
   * Determine if a webhook should be retried based on error type
   * @param {Error} error - The error that occurred
   * @returns {boolean} - Whether to retry
   */
  shouldRetry(error) {
    // Retry on network errors, timeouts, and 5xx server errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return true;
    }
    
    if (error.response && error.response.status >= 500) {
      return true;
    }
    
    return false;
  }

  /**
   * Send webhook notifications to multiple endpoints
   * @param {Array} webhooks - Array of webhook configurations
   * @param {Object} payload - Webhook payload
   * @returns {Promise<Array>} - Results of webhook attempts
   */
  async sendWebhooks(webhooks, payload) {
    const results = [];
    
    // Process webhooks in batches
    for (let i = 0; i < webhooks.length; i += this.batchSize) {
      const batch = webhooks.slice(i, i + this.batchSize);
      const batchPromises = batch.map(webhook => 
        this.sendWebhook(webhook.url, payload, webhook.headers)
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches to avoid overwhelming endpoints
      if (i + this.batchSize < webhooks.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }

  /**
   * Create webhook payload for job status change
   * @param {Object} job - Job object
   * @param {string} event - Event type
   * @param {Object} previousState - Previous job state
   * @returns {Object} - Webhook payload
   */
  createJobPayload(job, event, previousState = null) {
    const payload = {
      event,
      timestamp: new Date().toISOString(),
      job: {
        id: job.id,
        name: job.name,
        status: job.status,
        progress: job.progress,
        tags: job.tags,
        metadata: job.metadata,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt
      }
    };

    if (previousState) {
      payload.previousState = previousState;
    }

    if (event === 'completion' && job.completedAt) {
      payload.job.completedAt = job.completedAt;
    }

    if (event === 'failure' && job.error) {
      payload.job.error = job.error;
    }

    return payload;
  }

  /**
   * Validate webhook URL
   * @param {string} url - URL to validate
   * @returns {boolean} - Whether URL is valid
   */
  validateWebhookUrl(url) {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }
}

module.exports = new WebhookManager();
