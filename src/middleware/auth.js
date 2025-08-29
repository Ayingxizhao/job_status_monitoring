const basicAuth = require('express-basic-auth');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * Basic authentication middleware
 */
const basicAuthMiddleware = basicAuth({
  users: {
    [process.env.BASIC_AUTH_USERNAME || 'admin']: process.env.BASIC_AUTH_PASSWORD || 'admin123'
  },
  challenge: true,
  realm: 'Job Status API'
});

/**
 * JWT authentication middleware
 */
const jwtAuth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    logger.warn('Invalid JWT token', { token: token.substring(0, 10) + '...' });
    return res.status(401).json({ error: 'Invalid token.' });
  }
};

/**
 * Main authentication middleware that checks if auth is enabled
 */
const authenticate = (req, res, next) => {
  if (process.env.AUTH_ENABLED === 'false') {
    return next();
  }

  // Check for JWT token first
  const authHeader = req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return jwtAuth(req, res, next);
  }

  // Fall back to basic auth
  return basicAuthMiddleware(req, res, next);
};

/**
 * Generate JWT token for a user
 * @param {Object} user - User object
 * @returns {string} - JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username,
      role: user.role || 'user'
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object|null} - Decoded token payload or null
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = {
  authenticate,
  basicAuthMiddleware,
  jwtAuth,
  generateToken,
  verifyToken
};
