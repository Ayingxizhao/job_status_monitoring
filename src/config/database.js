const knex = require('knex');
const logger = require('../utils/logger');

let db;

const getDatabaseConfig = () => {
  const dbType = process.env.DB_TYPE || 'postgresql';
  
  const configs = {
    postgresql: {
      client: 'pg',
      connection: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'job_status',
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
      },
      pool: {
        min: 2,
        max: 10
      },
      migrations: {
        directory: './src/migrations'
      }
    },
    mysql: {
      client: 'mysql2',
      connection: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'job_status'
      },
      pool: {
        min: 2,
        max: 10
      },
      migrations: {
        directory: './src/migrations'
      }
    }
  };

  return configs[dbType] || configs.postgresql;
};

const initialize = async () => {
  try {
    const config = getDatabaseConfig();
    db = knex(config);
    
    // Test connection
    await db.raw('SELECT 1');
    logger.info(`Database connection established (${process.env.DB_TYPE || 'postgresql'})`);
    
    // Run migrations
    await db.migrate.latest();
    logger.info('Database migrations completed');
    
    return db;
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
};

const getConnection = () => {
  if (!db) {
    throw new Error('Database not initialized. Call initialize() first.');
  }
  return db;
};

const close = async () => {
  if (db) {
    await db.destroy();
    logger.info('Database connection closed');
  }
};

module.exports = {
  initialize,
  getConnection,
  close
};
