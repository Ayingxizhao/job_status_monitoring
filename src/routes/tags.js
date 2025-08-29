const express = require('express');
const database = require('../config/database');
const { validate, tagQuerySchema } = require('../middleware/validation');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * /api/tags:
 *   get:
 *     summary: List all tags
 *     tags: [Tags]
 *     parameters:
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
 *         description: List of tags with usage counts
 */
router.get('/', validate(tagQuerySchema, 'query'), async (req, res) => {
  try {
    const { limit, offset } = req.query;
    const db = database.getConnection();
    
    // Get all jobs with tags and process them in JavaScript
    const jobsWithTags = await db('jobs')
      .whereNotNull('tags')
      .whereNot('tags', '[]')
      .whereNot('tags', '{}')
      .whereNot('tags', '[object Object]')  // Skip malformed tags
      .select('tags');
    
    // Process tags in JavaScript
    const tagCounts = {};
    jobsWithTags.forEach(job => {
      try {
        const tags = JSON.parse(job.tags);
        if (Array.isArray(tags)) {
          tags.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          });
        }
      } catch (e) {
        // Skip invalid JSON
      }
    });
    
    // Convert to array and sort
    const tags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, usageCount: count }))
      .sort((a, b) => b.usageCount - a.usageCount || a.tag.localeCompare(b.tag))
      .slice(offset, offset + limit);
    
    const total = Object.keys(tagCounts).length;
    
    res.json({
      tags: tags,
      pagination: {
        total: total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: offset + limit < total
      }
    });
  } catch (error) {
    logger.error('Failed to fetch tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

/**
 * @swagger
 * /api/tags/{tag}/jobs:
 *   get:
 *     summary: Get jobs by tag
 *     tags: [Tags]
 *     parameters:
 *       - in: path
 *         name: tag
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, running, completed, failed, cancelled]
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
 *         description: Jobs with the specified tag
 */
router.get('/:tag/jobs', async (req, res) => {
  try {
    const { tag } = req.params;
    const { status, startDate, endDate, limit = 100, offset = 0 } = req.query;
    
    const db = database.getConnection();
    
    let query = db('jobs')
      .select('*');
    
    query = query.whereRaw('tags @> ?', [JSON.stringify([tag])]);
    
    // Apply additional filters
    if (status) {
      query = query.where('status', status);
    }
    
    if (startDate) {
      query = query.where('created_at', '>=', startDate);
    }
    
    if (endDate) {
      query = query.where('created_at', '<=', endDate);
    }
    
    // Apply pagination
    query = query.orderBy('created_at', 'desc').limit(limit).offset(offset);
    
    const jobs = await query;
    
    // Get total count for pagination
    let countQuery = db('jobs').count('* as total');
    
    countQuery = countQuery.whereRaw('tags @> ?', [JSON.stringify([tag])]);
    
    if (status) countQuery = countQuery.where('status', status);
    if (startDate) countQuery = countQuery.where('created_at', '>=', startDate);
    if (endDate) countQuery = countQuery.where('created_at', '<=', endDate);
    
    const [{ total }] = await countQuery;
    
    res.json({
      tag,
      jobs: jobs.map(formatJobResponse),
      pagination: {
        total: parseInt(total),
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: offset + limit < total
      }
    });
  } catch (error) {
    logger.error('Failed to fetch jobs by tag:', error);
    res.status(500).json({ error: 'Failed to fetch jobs by tag' });
  }
});

/**
 * @swagger
 * /api/tags/{tag}/stats:
 *   get:
 *     summary: Get tag statistics
 *     tags: [Tags]
 *     parameters:
 *       - in: path
 *         name: tag
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tag statistics
 */
router.get('/:tag/stats', async (req, res) => {
  try {
    const { tag } = req.params;
    const db = database.getConnection();
    
    // Get job count by status for this tag
    const statusStats = await db.raw(`
      SELECT 
        status,
        COUNT(*) as count
      FROM jobs 
      WHERE tags @> ?
      GROUP BY status
      ORDER BY count DESC
    `, [JSON.stringify([tag])]);
    
    // Get total job count for this tag
    const [{ totalJobs }] = await db.raw(`
      SELECT COUNT(*) as total
      FROM jobs 
      WHERE tags @> ?
    `, [JSON.stringify([tag])]);
    
    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const [{ recentJobs }] = await db.raw(`
      SELECT COUNT(*) as total
      FROM jobs 
      WHERE tags @> ? AND created_at >= ?
    `, [JSON.stringify([tag]), thirtyDaysAgo]);
    
    // Get average completion time for completed jobs
    const [{ avgCompletionTime }] = await db.raw(`
      SELECT 
        AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_seconds
      FROM jobs 
      WHERE tags @> ? AND status = 'completed' AND completed_at IS NOT NULL
    `, [JSON.stringify([tag])]);
    
    res.json({
      tag,
      totalJobs: parseInt(totalJobs),
      recentJobs: parseInt(recentJobs),
      averageCompletionTimeSeconds: avgCompletionTime ? Math.round(avgCompletionTime) : null,
      statusBreakdown: statusStats.rows.map(row => ({
        status: row.status,
        count: parseInt(row.count)
      }))
    });
  } catch (error) {
    logger.error('Failed to fetch tag statistics:', error);
    res.status(500).json({ error: 'Failed to fetch tag statistics' });
  }
});

/**
 * @swagger
 * /api/tags/search:
 *   get:
 *     summary: Search tags
 *     tags: [Tags]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query for tag names
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Matching tags
 */
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    
    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const db = database.getConnection();
    
    // Search for tags that contain the query string
    const tags = await db.raw(`
      SELECT 
        jsonb_array_elements_text(tags) as tag,
        COUNT(*) as usage_count
      FROM jobs 
      WHERE tags IS NOT NULL 
        AND jsonb_array_length(tags) > 0
        AND jsonb_array_elements_text(tags) ILIKE ?
      GROUP BY jsonb_array_elements_text(tags)
      ORDER BY usage_count DESC, tag ASC
      LIMIT ?
    `, [`%${q}%`, limit]);
    
    res.json({
      query: q,
      tags: tags.rows.map(row => ({
        tag: row.tag,
        usageCount: parseInt(row.usage_count)
      }))
    });
  } catch (error) {
    logger.error('Failed to search tags:', error);
    res.status(500).json({ error: 'Failed to search tags' });
  }
});

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
