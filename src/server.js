const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

// Load environment variables
dotenv.config();

// Import modules
const logger = require('./utils/logger');
const database = require('./config/database');
const redis = require('./config/redis');
const auth = require('./middleware/auth');
const cleanupService = require('./services/cleanup');
const { swaggerOptions } = require('./config/swagger');

// Import routes
const jobsRouter = require('./routes/jobs');
const webhooksRouter = require('./routes/webhooks');
const tagsRouter = require('./routes/tags');
const healthRouter = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Swagger documentation
const specs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Health check endpoint
app.use('/health', healthRouter);

// API routes with authentication
app.use('/api/jobs', auth.authenticate, jobsRouter);
app.use('/api/webhooks', auth.authenticate, webhooksRouter);
app.use('/api/tags', auth.authenticate, tagsRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Job Status API',
    version: '1.0.0',
    documentation: '/api-docs',
    health: '/health'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  cleanupService.stop();
  await database.close();
  await redis.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  cleanupService.stop();
  await database.close();
  await redis.quit();
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    // Initialize database
    await database.initialize();
    logger.info('Database initialized successfully');

    // Initialize Redis (optional)
    try {
      await redis.initialize();
      logger.info('Redis initialized successfully');
    } catch (error) {
      logger.warn('Redis initialization failed, continuing without Redis:', error.message);
    }

    // Start cleanup service
    cleanupService.start();
    logger.info('Cleanup service started');

    // Start server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`API Documentation: http://localhost:${PORT}/api-docs`);
      logger.info(`Health Check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
