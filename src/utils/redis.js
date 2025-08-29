const redis = require('redis');
const logger = require('./logger');

let redisClient;

const initialize = async () => {
  try {
    redisClient = redis.createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379
      },
      password: process.env.REDIS_PASSWORD || undefined,
      database: parseInt(process.env.REDIS_DB) || 0
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });

    redisClient.on('end', () => {
      logger.info('Redis client disconnected');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error('Redis initialization failed:', error);
    throw error;
  }
};

const getClient = () => {
  if (!redisClient) {
    throw new Error('Redis not initialized. Call initialize() first.');
  }
  return redisClient;
};

const isAvailable = () => {
  return redisClient && redisClient.isReady;
};

const set = async (key, value, ttl = null) => {
  try {
    if (!isAvailable()) {
      logger.warn('Redis not available, skipping cache operation');
      return false;
    }
    
    const client = getClient();
    if (ttl) {
      await client.setEx(key, ttl, JSON.stringify(value));
    } else {
      await client.set(key, JSON.stringify(value));
    }
    return true;
  } catch (error) {
    logger.error('Redis set error:', error);
    return false;
  }
};

const get = async (key) => {
  try {
    if (!isAvailable()) {
      logger.warn('Redis not available, skipping cache operation');
      return null;
    }
    
    const client = getClient();
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logger.error('Redis get error:', error);
    return null;
  }
};

const del = async (key) => {
  try {
    if (!isAvailable()) {
      logger.warn('Redis not available, skipping cache operation');
      return false;
    }
    
    const client = getClient();
    await client.del(key);
    return true;
  } catch (error) {
    logger.error('Redis del error:', error);
    return false;
  }
};

const exists = async (key) => {
  try {
    if (!isAvailable()) {
      logger.warn('Redis not available, skipping cache operation');
      return false;
    }
    
    const client = getClient();
    const result = await client.exists(key);
    return result === 1;
  } catch (error) {
    logger.error('Redis exists error:', error);
    return false;
  }
};

const quit = async () => {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis connection closed');
  }
};

module.exports = {
  initialize,
  getClient,
  isAvailable,
  set,
  get,
  del,
  exists,
  quit
};
