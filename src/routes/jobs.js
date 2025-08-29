const express = require('express');
const { v4: uuidv4 } = require('uuid');
const database = require('../config/database');
const redis = require('../config/redis');
const webhookManager = require('../utils/webhook');
const { validate, createJobSchema, updateJobSchema, jobQuerySchema, bulkOperationsSchema } = require('../middleware/validation');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * /api/jobs:
 *   post:
 *     summary: Create a new job
 *     tags: [Jobs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Job'
 *     responses:
 *       201:
 *         description: Job created successfully
 *       400:
 *         description: Validation error
 */
router.post('/', validate(createJobSchema), async (req, res) => {
  try {
    const db = database.getConnection();
    const jobData = {
      id: uuidv4(),
      ...req.body,
      created_at: new Date(),
      updated_at: new Date()
    };

    const [job] = await db('jobs').insert(jobData).returning('*');
    
    // Cache the job
    await redis.set(`job:${job.id}`, job, 3600); // Cache for 1 hour
    
    // Trigger webhooks for new job
    await triggerWebhooks(job, 'status_change');
    
    logger.info('Job created', { jobId: job.id, name: job.name });
    
    res.status(201).json({
      message: 'Job created successfully',
      job: formatJobResponse(job)
    });
  } catch (error) {
    logger.error('Failed to create job:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

/**
 * @swagger
 * /api/jobs:
 *   get:
 *     summary: List jobs with filtering
 *     tags: [Jobs]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, running, completed, failed, cancelled]
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of jobs
 */
router.get('/', validate(jobQuerySchema, 'query'), async (req, res) => {
  try {
    const db = database.getConnection();
    const { status, tags, startDate, endDate, limit, offset, sortBy, sortOrder } = req.query;
    
    let query = db('jobs').select('*');
    
    // Apply filters
    if (status) {
      query = query.where('status', status);
    }
    
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query = query.whereRaw('tags @> ?', [JSON.stringify(tagArray)]);
    }
    
    if (startDate) {
      query = query.where('created_at', '>=', startDate);
    }
    
    if (endDate) {
      query = query.where('created_at', '<=', endDate);
    }
    
    // Apply sorting
    query = query.orderBy(sortBy, sortOrder);
    
    // Apply pagination
    query = query.limit(limit).offset(offset);
    
    const jobs = await query;
    
    // Get total count for pagination
    let countQuery = db('jobs').count('* as total');
    if (status) countQuery = countQuery.where('status', status);
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      countQuery = countQuery.whereRaw('tags @> ?', [JSON.stringify(tagArray)]);
    }
    if (startDate) countQuery = countQuery.where('created_at', '>=', startDate);
    if (endDate) countQuery = countQuery.where('created_at', '<=', endDate);
    
    const [{ total }] = await countQuery;
    
    res.json({
      jobs: jobs.map(formatJobResponse),
      pagination: {
        total: parseInt(total),
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: offset + limit < total
      }
    });
  } catch (error) {
    logger.error('Failed to fetch jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

/**
 * @swagger
 * /api/jobs/{id}:
 *   get:
 *     summary: Get job details
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Job details
 *       404:
 *         description: Job not found
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Try cache first
    let job = await redis.get(`job:${id}`);
    
    if (!job) {
      const db = database.getConnection();
      const [result] = await db('jobs').where('id', id).select('*');
      
      if (!result) {
        return res.status(404).json({ error: 'Job not found' });
      }
      
      job = result;
      // Cache the job
      await redis.set(`job:${id}`, job, 3600);
    }
    
    res.json({
      job: formatJobResponse(job)
    });
  } catch (error) {
    logger.error('Failed to fetch job:', error);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

/**
 * @swagger
 * /api/jobs/{id}:
 *   put:
 *     summary: Update job
 *     tags: [Jobs]
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
 *             $ref: '#/components/schemas/Job'
 *     responses:
 *       200:
 *         description: Job updated successfully
 *       404:
 *         description: Job not found
 */
router.put('/:id', validate(updateJobSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const db = database.getConnection();
    
    // Get current job state for webhook comparison
    const [currentJob] = await db('jobs').where('id', id).select('*');
    if (!currentJob) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    const updateData = {
      ...req.body,
      updated_at: new Date()
    };
    
    // Handle completion timestamp
    if (req.body.status === 'completed' && !currentJob.completed_at) {
      updateData.completed_at = new Date();
    }
    
    const [updatedJob] = await db('jobs')
      .where('id', id)
      .update(updateData)
      .returning('*');
    
    // Clear cache
    await redis.del(`job:${id}`);
    
    // Trigger webhooks if status changed
    if (req.body.status && req.body.status !== currentJob.status) {
      await triggerWebhooks(updatedJob, 'status_change', currentJob);
    }
    
    // Trigger progress webhook if progress changed
    if (req.body.progress !== undefined && req.body.progress !== currentJob.progress) {
      await triggerWebhooks(updatedJob, 'progress_update', currentJob);
    }
    
    logger.info('Job updated', { jobId: id, status: updatedJob.status });
    
    res.json({
      message: 'Job updated successfully',
      job: formatJobResponse(updatedJob)
    });
  } catch (error) {
    logger.error('Failed to update job:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

/**
 * @swagger
 * /api/jobs/{id}:
 *   delete:
 *     summary: Delete job
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Job deleted successfully
 *       404:
 *         description: Job not found
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = database.getConnection();
    
    const deletedCount = await db('jobs').where('id', id).del();
    
    if (deletedCount === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    // Clear cache
    await redis.del(`job:${id}`);
    
    logger.info('Job deleted', { jobId: id });
    
    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    logger.error('Failed to delete job:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

/**
 * @swagger
 * /api/jobs/bulk:
 *   post:
 *     summary: Bulk operations on jobs
 *     tags: [Jobs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               operations:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Bulk operations completed
 */
router.post('/bulk', validate(bulkOperationsSchema), async (req, res) => {
  try {
    const db = database.getConnection();
    const { operations } = req.body;
    const results = [];
    
    for (const op of operations) {
      try {
        switch (op.operation) {
          case 'create':
            const jobData = {
              id: uuidv4(),
              ...op.data,
              created_at: new Date(),
              updated_at: new Date()
            };
            const [createdJob] = await db('jobs').insert(jobData).returning('*');
            await redis.set(`job:${createdJob.id}`, createdJob, 3600);
            await triggerWebhooks(createdJob, 'status_change');
            results.push({ operation: 'create', success: true, job: createdJob });
            break;
            
          case 'update':
            const updateData = {
              ...op.data,
              updated_at: new Date()
            };
            delete updateData.id;
            
            if (updateData.status === 'completed') {
              updateData.completed_at = new Date();
            }
            
            const [updatedJob] = await db('jobs')
              .where('id', op.data.id)
              .update(updateData)
              .returning('*');
              
            if (updatedJob) {
              await redis.del(`job:${op.data.id}`);
              await triggerWebhooks(updatedJob, 'status_change');
              results.push({ operation: 'update', success: true, job: updatedJob });
            } else {
              results.push({ operation: 'update', success: false, error: 'Job not found' });
            }
            break;
            
          case 'delete':
            const deletedCount = await db('jobs').where('id', op.data.id).del();
            if (deletedCount > 0) {
              await redis.del(`job:${op.data.id}`);
              results.push({ operation: 'delete', success: true });
            } else {
              results.push({ operation: 'delete', success: false, error: 'Job not found' });
            }
            break;
        }
      } catch (error) {
        results.push({ 
          operation: op.operation, 
          success: false, 
          error: error.message 
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    logger.info('Bulk operations completed', { 
      total: operations.length, 
      successful: successCount 
    });
    
    res.json({
      message: `Bulk operations completed. ${successCount}/${operations.length} successful.`,
      results
    });
  } catch (error) {
    logger.error('Failed to execute bulk operations:', error);
    res.status(500).json({ error: 'Failed to execute bulk operations' });
  }
});

/**
 * Trigger webhooks for job events
 */
async function triggerWebhooks(job, eventType, previousState = null) {
  try {
    const db = database.getConnection();
    const webhooks = await db('webhooks')
      .where('is_active', true)
      .whereRaw('events @> ?', [JSON.stringify([eventType])])
      .select('*');
    if (webhooks.length > 0) {
      const payload = webhookManager.createJobPayload(job, eventType, previousState);
      await webhookManager.sendWebhooks(webhooks, payload);
    }
  } catch (error) {
    logger.error('Failed to trigger webhooks:', error);
  }
}

/**
 * Format job response for API
 */
function formatJobResponse(job) {
  return {
    id: job.id,
    name: job.name,
    description: job.description,
    status: job.status,
    progress: job.progress,
    tags: job.tags || [],
    metadata: job.metadata || {},
    ttl: job.ttl,
    error: job.error,
    createdAt: job.created_at,
    updatedAt: job.updated_at,
    completedAt: job.completed_at
  };
}

module.exports = router;
