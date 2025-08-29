const Joi = require('joi');
const logger = require('../utils/logger');

/**
 * Generic validation middleware
 * @param {Object} schema - Joi validation schema
 * @param {string} property - Request property to validate ('body', 'query', 'params')
 * @returns {Function} - Express middleware function
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      logger.warn('Validation failed', {
        property,
        errors: error.details,
        path: req.path
      });
      
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }

    // Replace validated data
    req[property] = value;
    next();
  };
};

/**
 * Job creation validation schema
 */
const createJobSchema = Joi.object({
  name: Joi.string().required().min(1).max(255),
  description: Joi.string().max(1000).optional(),
  status: Joi.string().valid('pending', 'running', 'completed', 'failed', 'cancelled').default('pending'),
  progress: Joi.number().min(0).max(100).default(0),
  tags: Joi.array().items(Joi.string().max(50)).max(20).optional(),
  metadata: Joi.object().max(50).optional(),
  ttl: Joi.number().positive().optional()
});

/**
 * Job update validation schema
 */
const updateJobSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  description: Joi.string().max(1000).optional(),
  status: Joi.string().valid('pending', 'running', 'completed', 'failed', 'cancelled').optional(),
  progress: Joi.number().min(0).max(100).optional(),
  tags: Joi.array().items(Joi.string().max(50)).max(20).optional(),
  metadata: Joi.object().max(50).optional(),
  ttl: Joi.number().positive().optional()
});

/**
 * Job query validation schema
 */
const jobQuerySchema = Joi.object({
  status: Joi.string().valid('pending', 'running', 'completed', 'failed', 'cancelled').optional(),
  tags: Joi.alternatives().try(
    Joi.string(),
    Joi.array().items(Joi.string())
  ).optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  limit: Joi.number().integer().min(1).max(1000).default(100),
  offset: Joi.number().integer().min(0).default(0),
  sortBy: Joi.string().valid('created_at', 'updated_at', 'name', 'status').default('created_at'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

/**
 * Bulk operations validation schema
 */
const bulkOperationsSchema = Joi.object({
  operations: Joi.array().items(
    Joi.object({
      operation: Joi.string().valid('create', 'update', 'delete').required(),
      data: Joi.object().when('operation', {
        is: 'create',
        then: createJobSchema.required()
      }).when('operation', {
        is: 'update',
        then: Joi.object({
          id: Joi.string().uuid().required(),
          ...updateJobSchema.describe().keys
        }).required()
      }).when('operation', {
        is: 'delete',
        then: Joi.object({
          id: Joi.string().uuid().required()
        }).required()
      })
    })
  ).min(1).max(100).required()
});

/**
 * Webhook validation schema
 */
const webhookSchema = Joi.object({
  url: Joi.string().uri().required(),
  events: Joi.array().items(
    Joi.string().valid('status_change', 'progress_update', 'completion', 'failure')
  ).min(1).required(),
  headers: Joi.object().max(20).optional(),
  isActive: Joi.boolean().default(true)
});

/**
 * Tag query validation schema
 */
const tagQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(1000).default(100),
  offset: Joi.number().integer().min(0).default(0)
});

module.exports = {
  validate,
  createJobSchema,
  updateJobSchema,
  jobQuerySchema,
  bulkOperationsSchema,
  webhookSchema,
  tagQuerySchema
};
