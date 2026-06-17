const { supabase } = require('../utils/supabase');
const { logger } = require('../utils/logger');

/**
 * Middleware to authenticate requests using Supabase JWT
 */
async function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No authorization token provided' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Auth middleware error', { error: error.message });
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Optional auth - doesn't reject if no token
 */
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const { data: { user } } = await supabase.auth.getUser(token);
    req.user = user || null;
  } catch {
    req.user = null;
  }

  next();
}

module.exports = { authenticateUser, optionalAuth };
