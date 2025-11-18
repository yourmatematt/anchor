/**
 * Security Management API Routes
 *
 * Endpoints for security administration and monitoring
 */

const express = require('express');
const router = express.Router();
const securityMonitor = require('../services/security-monitor');
const fraudDetector = require('../services/fraud-detector');
const rateLimiter = require('../services/rate-limiter-advanced');
const auditLogger = require('../services/audit-logger');
const encryptionService = require('../services/encryption-service');

// Middleware: Admin only
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

/**
 * GET /security/stats
 * Get security statistics
 */
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const stats = {
      security: securityMonitor.getStatistics(),
      fraud: fraudDetector.getStatistics(),
      audit: await auditLogger.getStatistics()
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /security/blocked-ips
 * Get list of blocked IPs
 */
router.get('/blocked-ips', requireAdmin, (req, res) => {
  const blocked = Array.from(securityMonitor.blockedIPs);
  res.json({ ips: blocked, count: blocked.length });
});

/**
 * POST /security/unblock-ip
 * Unblock an IP address
 */
router.post('/unblock-ip', requireAdmin, async (req, res) => {
  const { ip } = req.body;

  if (!ip) {
    return res.status(400).json({ error: 'IP address required' });
  }

  securityMonitor.unblockIP(ip);

  await auditLogger.logAdminAction({
    adminId: req.user.id,
    action: 'unblock_ip',
    ip,
    timestamp: Date.now()
  });

  res.json({ success: true, message: `IP ${ip} unblocked` });
});

/**
 * GET /security/blocked-users
 * Get list of blocked users
 */
router.get('/blocked-users', requireAdmin, (req, res) => {
  const blocked = Array.from(securityMonitor.blockedUsers);
  res.json({ users: blocked, count: blocked.length });
});

/**
 * POST /security/unblock-user
 * Unblock a user
 */
router.post('/unblock-user', requireAdmin, async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID required' });
  }

  securityMonitor.unblockUser(userId);

  await auditLogger.logAdminAction({
    adminId: req.user.id,
    action: 'unblock_user',
    targetUserId: userId,
    timestamp: Date.now()
  });

  res.json({ success: true, message: `User ${userId} unblocked` });
});

/**
 * GET /security/fraud/flagged
 * Get flagged users
 */
router.get('/fraud/flagged', requireAdmin, (req, res) => {
  const flagged = [];

  for (const [userId, data] of fraudDetector.flaggedUsers.entries()) {
    flagged.push({
      userId,
      ...data
    });
  }

  res.json({ flagged, count: flagged.length });
});

/**
 * GET /security/fraud/:userId
 * Get fraud status for specific user
 */
router.get('/fraud/:userId', requireAdmin, (req, res) => {
  const { userId } = req.params;
  const status = fraudDetector.getUserFraudStatus(userId);

  res.json({ userId, ...status });
});

/**
 * POST /security/fraud/clear-flag
 * Clear fraud flag for user
 */
router.post('/fraud/clear-flag', requireAdmin, async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID required' });
  }

  fraudDetector.clearUserFlag(userId);

  await auditLogger.logAdminAction({
    adminId: req.user.id,
    action: 'clear_fraud_flag',
    targetUserId: userId,
    timestamp: Date.now()
  });

  res.json({ success: true, message: `Fraud flag cleared for user ${userId}` });
});

/**
 * GET /security/audit/logs
 * Query audit logs
 */
router.get('/audit/logs', requireAdmin, async (req, res) => {
  try {
    const { userId, category, level, date } = req.query;

    const logs = await auditLogger.queryLogs({
      userId,
      category,
      level,
      date
    });

    res.json({ logs, count: logs.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /security/rate-limit/clear
 * Clear rate limit for user
 */
router.post('/rate-limit/clear', requireAdmin, async (req, res) => {
  const { userId, endpoint } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID required' });
  }

  const key = endpoint ?
    `ratelimit:${endpoint}:${userId}` :
    `ratelimit:*:${userId}`;

  rateLimiter.clearLimit(key);

  await auditLogger.logAdminAction({
    adminId: req.user.id,
    action: 'clear_rate_limit',
    targetUserId: userId,
    endpoint,
    timestamp: Date.now()
  });

  res.json({ success: true, message: 'Rate limit cleared' });
});

/**
 * POST /security/rate-limit/whitelist
 * Add user/IP to whitelist
 */
router.post('/rate-limit/whitelist', requireAdmin, async (req, res) => {
  const { identifier } = req.body; // userId or IP

  if (!identifier) {
    return res.status(400).json({ error: 'Identifier required' });
  }

  rateLimiter.addToWhitelist(identifier);

  await auditLogger.logAdminAction({
    adminId: req.user.id,
    action: 'add_to_whitelist',
    identifier,
    timestamp: Date.now()
  });

  res.json({ success: true, message: `${identifier} added to whitelist` });
});

/**
 * DELETE /security/rate-limit/whitelist
 * Remove from whitelist
 */
router.delete('/rate-limit/whitelist', requireAdmin, async (req, res) => {
  const { identifier } = req.body;

  if (!identifier) {
    return res.status(400).json({ error: 'Identifier required' });
  }

  rateLimiter.removeFromWhitelist(identifier);

  await auditLogger.logAdminAction({
    adminId: req.user.id,
    action: 'remove_from_whitelist',
    identifier,
    timestamp: Date.now()
  });

  res.json({ success: true, message: `${identifier} removed from whitelist` });
});

/**
 * POST /security/encryption/rotate-key
 * Rotate encryption key
 */
router.post('/encryption/rotate-key', requireAdmin, async (req, res) => {
  try {
    const newKeyId = await encryptionService.rotateKey();

    await auditLogger.logAdminAction({
      adminId: req.user.id,
      action: 'rotate_encryption_key',
      newKeyId,
      timestamp: Date.now()
    });

    res.json({
      success: true,
      message: 'Encryption key rotated',
      newKeyId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /security/alerts
 * Get recent security alerts
 */
router.get('/alerts', requireAdmin, async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const logs = await auditLogger.queryLogs({
      category: 'security_event',
      date: new Date().toISOString().split('T')[0]
    });

    const alerts = logs
      .filter(log => log.level === 'critical' || log.level === 'error')
      .slice(-limit);

    res.json({ alerts, count: alerts.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
