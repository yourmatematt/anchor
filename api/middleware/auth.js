/**
 * Authentication Middleware
 * JWT token verification for API routes
 */

const jwt = require('jsonwebtoken');
const { supabase } = require('../utils/supabase');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Verify JWT token and attach user to request
 */
async function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: true,
        code: 'UNAUTHORIZED',
        message: 'No authentication token provided',
      });
    }

    const token = authHeader.substring(7);

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Get user from database
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return res.status(401).json({
        error: true,
        code: 'INVALID_TOKEN',
        message: 'Invalid authentication token',
      });
    }

    // Attach user to request
    req.user = user;
    req.userId = user.id;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: true,
        code: 'TOKEN_EXPIRED',
        message: 'Authentication token has expired',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: true,
        code: 'INVALID_TOKEN',
        message: 'Invalid authentication token',
      });
    }

    console.error('Authentication error:', error);
    return res.status(500).json({
      error: true,
      code: 'AUTH_ERROR',
      message: 'Authentication failed',
    });
  }
}

/**
 * Verify guardian token and attach guardian + user to request
 */
async function authenticateGuardian(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: true,
        code: 'UNAUTHORIZED',
        message: 'No authentication token provided',
      });
    }

    const token = authHeader.substring(7);

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded.guardianId) {
      return res.status(401).json({
        error: true,
        code: 'INVALID_GUARDIAN_TOKEN',
        message: 'Invalid guardian token',
      });
    }

    // Get guardian from database
    const { data: guardian, error } = await supabase
      .from('guardians')
      .select('*, users!guardians_user_id_fkey(*)')
      .eq('id', decoded.guardianId)
      .eq('status', 'active')
      .single();

    if (error || !guardian) {
      return res.status(401).json({
        error: true,
        code: 'INVALID_GUARDIAN_TOKEN',
        message: 'Invalid guardian token',
      });
    }

    // Attach guardian and user to request
    req.guardian = guardian;
    req.guardianId = guardian.id;
    req.user = guardian.users;
    req.userId = guardian.user_id;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: true,
        code: 'TOKEN_EXPIRED',
        message: 'Guardian token has expired',
      });
    }

    console.error('Guardian authentication error:', error);
    return res.status(500).json({
      error: true,
      code: 'AUTH_ERROR',
      message: 'Authentication failed',
    });
  }
}

/**
 * Verify service API key for internal endpoints
 */
async function authenticateService(req, res, next) {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey || apiKey !== process.env.SERVICE_API_KEY) {
      return res.status(401).json({
        error: true,
        code: 'UNAUTHORIZED',
        message: 'Invalid service API key',
      });
    }

    next();
  } catch (error) {
    console.error('Service authentication error:', error);
    return res.status(500).json({
      error: true,
      code: 'AUTH_ERROR',
      message: 'Authentication failed',
    });
  }
}

/**
 * Generate JWT token (unified function)
 */
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Generate JWT token for user
 */
function generateUserToken(userId) {
  return generateToken({ userId, type: 'user' });
}

/**
 * Generate JWT token for guardian
 */
function generateGuardianToken(guardianId, userId) {
  return generateToken({ guardianId, userId, type: 'guardian' });
}

module.exports = {
  authenticateUser,
  authenticateGuardian,
  authenticateService,
  generateToken,
  generateUserToken,
  generateGuardianToken,
};
