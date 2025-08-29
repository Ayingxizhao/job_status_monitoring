const express = require('express');
const { v4: uuidv4 } = require('uuid');
const database = require('../config/database');
const { validate, webhookSchema } = require('../middleware/validation');
const webhookManager = require('../utils/webhook');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * /api/webhooks:
 *   post:
 *     summary: Register a new webhook
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Webhook'
 *     responses:
 *       201:
 *         description: Webhook registered successfully
 *       400:
 *         description: Validation error
 */
router.post('/', validate(webhookSchema), async (req, res) => {
  try {
    const { url, events, headers, isActive } = req.body;
    
    // Validate webhook URL
    if (!webhookManager.validateWebhookUrl(url)) {
      return res.status(400).json({ error: 'Invalid webhook URL' });
    }
    
    const db = database.getConnection();
    const webhookData = {
      id: uuidv4(),
      url,
      events,
      headers: headers || {},
      is_active: isActive !== undefined ? isActive : true,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    const [webhook] = await db('webhooks').insert(webhookData).returning('*');
    
    logger.info('Webhook registered', { webhookId: webhook.id, url });
    
    res.status(201).json({
      message: 'Webhook registered successfully',
      webhook: formatWebhookResponse(webhook)
    });
  } catch (error) {
    logger.error('Failed to register webhook:', error);
    res.status(500).json({ error: 'Failed to register webhook' });
  }
});

/**
 * @swagger
 * /api/webhooks:
 *   get:
 *     summary: List all webhooks
 *     tags: [Webhooks]
 *     responses:
 *       200:
 *         description: List of webhooks
 */
router.get('/', async (req, res) => {
  try {
    const db = database.getConnection();
    const webhooks = await db('webhooks')
      .select('*')
      .orderBy('created_at', 'desc');
    
    res.json({
      webhooks: webhooks.map(formatWebhookResponse)
    });
  } catch (error) {
    logger.error('Failed to fetch webhooks:', error);
    res.status(500).json({ error: 'Failed to fetch webhooks' });
  }
});

/**
 * @swagger
 * /api/webhooks/{id}:
 *   get:
 *     summary: Get webhook details
 *     tags: [Webhooks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Webhook details
 *       404:
 *         description: Webhook not found
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = database.getConnection();
    
    const [webhook] = await db('webhooks').where('id', id).select('*');
    
    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }
    
    res.json({
      webhook: formatWebhookResponse(webhook)
    });
  } catch (error) {
    logger.error('Failed to fetch webhook:', error);
    res.status(500).json({ error: 'Failed to fetch webhook' });
  }
});

/**
 * @swagger
 * /api/webhooks/{id}:
 *   put:
 *     summary: Update webhook
 *     tags: [Webhooks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Webhook'
 *     responses:
 *       200:
 *         description: Webhook updated successfully
 *       404:
 *         description: Webhook not found
 */
router.put('/:id', validate(webhookSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { url, events, headers, isActive } = req.body;
    
    // Validate webhook URL
    if (!webhookManager.validateWebhookUrl(url)) {
      return res.status(400).json({ error: 'Invalid webhook URL' });
    }
    
    const db = database.getConnection();
    
    // Check if webhook exists
    const [existingWebhook] = await db('webhooks').where('id', id).select('*');
    if (!existingWebhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }
    
    const updateData = {
      url,
      events,
      headers: headers || {},
      is_active: isActive !== undefined ? isActive : true,
      updated_at: new Date()
    };
    
    const [updatedWebhook] = await db('webhooks')
      .where('id', id)
      .update(updateData)
      .returning('*');
    
    logger.info('Webhook updated', { webhookId: id, url });
    
    res.json({
      message: 'Webhook updated successfully',
      webhook: formatWebhookResponse(updatedWebhook)
    });
  } catch (error) {
    logger.error('Failed to update webhook:', error);
    res.status(500).json({ error: 'Failed to update webhook' });
  }
});

/**
 * @swagger
 * /api/webhooks/{id}:
 *   delete:
 *     summary: Remove webhook
 *     tags: [Webhooks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Webhook removed successfully
 *       404:
 *         description: Webhook not found
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = database.getConnection();
    
    const deletedCount = await db('webhooks').where('id', id).del();
    
    if (deletedCount === 0) {
      return res.status(404).json({ error: 'Webhook not found' });
    }
    
    logger.info('Webhook removed', { webhookId: id });
    
    res.json({ message: 'Webhook removed successfully' });
  } catch (error) {
    logger.error('Failed to remove webhook:', error);
    res.status(500).json({ error: 'Failed to remove webhook' });
  }
});

/**
 * @swagger
 * /api/webhooks/{id}/test:
 *   post:
 *     summary: Test webhook delivery
 *     tags: [Webhooks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Webhook test completed
 *       404:
 *         description: Webhook not found
 */
router.post('/:id/test', async (req, res) => {
  try {
    const { id } = req.params;
    const db = database.getConnection();
    
    const [webhook] = await db('webhooks').where('id', id).select('*');
    
    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }
    
    // Create test payload
    const testPayload = {
      event: 'test',
      timestamp: new Date().toISOString(),
      message: 'This is a test webhook from Job Status API',
      webhook: {
        id: webhook.id,
        url: webhook.url
      }
    };
    
    // Send test webhook
    const success = await webhookManager.sendWebhook(
      webhook.url,
      testPayload,
      webhook.headers
    );
    
    // Update last triggered timestamp
    if (success) {
      await db('webhooks')
        .where('id', id)
        .update({ 
          last_triggered: new Date(),
          updated_at: new Date()
        });
    }
    
    logger.info('Webhook test completed', { 
      webhookId: id, 
      success 
    });
    
    res.json({
      message: 'Webhook test completed',
      success,
      payload: testPayload
    });
  } catch (error) {
    logger.error('Failed to test webhook:', error);
    res.status(500).json({ error: 'Failed to test webhook' });
  }
});

/**
 * @swagger
 * /api/webhooks/{id}/deliveries:
 *   get:
 *     summary: Get webhook delivery history
 *     tags: [Webhooks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Webhook delivery history
 */
router.get('/:id/deliveries', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const db = database.getConnection();
    
    // Check if webhook exists
    const [webhook] = await db('webhooks').where('id', id).select('*');
    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }
    
    // Get delivery history
    const deliveries = await db('webhook_deliveries')
      .where('webhook_id', id)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
    
    // Get total count
    const [{ total }] = await db('webhook_deliveries')
      .where('webhook_id', id)
      .count('* as total');
    
    res.json({
      deliveries: deliveries.map(formatDeliveryResponse),
      pagination: {
        total: parseInt(total),
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: offset + limit < total
      }
    });
  } catch (error) {
    logger.error('Failed to fetch webhook deliveries:', error);
    res.status(500).json({ error: 'Failed to fetch webhook deliveries' });
  }
});

/**
 * Format webhook response for API
 */
function formatWebhookResponse(webhook) {
  return {
    id: webhook.id,
    url: webhook.url,
    events: webhook.events || [],
    headers: webhook.headers || {},
    isActive: webhook.is_active,
    retryCount: webhook.retry_count || 0,
    lastTriggered: webhook.last_triggered,
    createdAt: webhook.created_at,
    updatedAt: webhook.updated_at
  };
}

/**
 * Format delivery response for API
 */
function formatDeliveryResponse(delivery) {
  return {
    id: delivery.id,
    webhookId: delivery.webhook_id,
    jobId: delivery.job_id,
    eventType: delivery.event_type,
    payload: delivery.payload,
    statusCode: delivery.status_code,
    responseBody: delivery.response_body,
    errorMessage: delivery.error_message,
    retryCount: delivery.retry_count,
    deliveredAt: delivery.delivered_at,
    createdAt: delivery.created_at
  };
}

module.exports = router;
