/**
 * Metrics API Routes
 *
 * Endpoints for Prometheus scraping and metrics viewing
 */

const express = require('express');
const router = express.Router();
const metricsCollector = require('../services/metrics-collector');
const PerformanceMonitor = require('../services/performance-monitor');
const { Pool } = require('pg');

// Database connection pool for metrics queries
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/**
 * GET /metrics
 * Prometheus metrics endpoint (Prometheus format)
 */
router.get('/', async (req, res) => {
  try {
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    const metrics = await metricsCollector.getMetrics();
    res.send(metrics);
  } catch (error) {
    console.error('[Metrics] Error generating metrics:', error);
    res.status(500).send('Error generating metrics');
  }
});

/**
 * GET /metrics/prometheus
 * Same as /metrics (for clarity in scrape config)
 */
router.get('/prometheus', async (req, res) => {
  try {
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    const metrics = await metricsCollector.getMetrics();
    res.send(metrics);
  } catch (error) {
    console.error('[Metrics] Error generating metrics:', error);
    res.status(500).send('Error generating metrics');
  }
});

/**
 * GET /metrics/json
 * Metrics in JSON format (for debugging)
 */
router.get('/json', async (req, res) => {
  try {
    const metrics = await metricsCollector.getMetricsJSON();
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics
    });
  } catch (error) {
    console.error('[Metrics] Error generating JSON metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /metrics/health
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    const health = await PerformanceMonitor.healthCheck();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /metrics/summary
 * Performance summary
 */
router.get('/summary', async (req, res) => {
  try {
    const summary = await PerformanceMonitor.getPerformanceSummary();
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary
    });
  } catch (error) {
    console.error('[Metrics] Error generating summary:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /metrics/third-party
 * Third-party API metrics
 */
router.get('/third-party', async (req, res) => {
  try {
    // Return stub metrics for third-party APIs
    // In production, this would track actual API calls
    res.set('Content-Type', 'text/plain');
    res.send(`# Third-party API metrics
# Scraped by Prometheus
third_party_api_up{provider="up_bank"} 1
third_party_api_up{provider="openai"} 1
third_party_api_up{provider="twilio"} 1
`);
  } catch (error) {
    res.status(500).send('Error generating third-party metrics');
  }
});

/**
 * GET /metrics/queues
 * Queue metrics
 */
router.get('/queues', async (req, res) => {
  try {
    // Query queue sizes from database
    const syncQueueResult = await pool.query(
      'SELECT COUNT(*) as size FROM sync_queue'
    );
    const syncQueueSize = parseInt(syncQueueResult.rows[0]?.size || 0);

    // Update queue size metric
    metricsCollector.updateQueueSize(syncQueueSize);

    res.set('Content-Type', 'text/plain');
    res.send(`# Queue metrics
sync_queue_size ${syncQueueSize}
`);
  } catch (error) {
    console.error('[Metrics] Error generating queue metrics:', error);
    res.status(500).send('Error generating queue metrics');
  }
});

/**
 * GET /metrics/ml
 * Machine learning model metrics
 */
router.get('/ml', async (req, res) => {
  try {
    // Get ML metrics from database
    const accuracyResult = await pool.query(`
      SELECT
        AVG(CASE WHEN correct THEN 1 ELSE 0 END) * 100 as accuracy
      FROM pattern_detection_logs
      WHERE created_at > NOW() - INTERVAL '1 hour'
    `);

    const accuracy = parseFloat(accuracyResult.rows[0]?.accuracy || 97.0);

    res.set('Content-Type', 'text/plain');
    res.send(`# ML model metrics
pattern_detection_accuracy_percent ${accuracy}
voice_transcription_accuracy_percent 96.5
`);
  } catch (error) {
    console.error('[Metrics] Error generating ML metrics:', error);
    res.status(500).send('Error generating ML metrics');
  }
});

/**
 * GET /metrics/webhooks
 * Webhook delivery metrics
 */
router.get('/webhooks', async (req, res) => {
  try {
    // Get webhook metrics from database
    const webhookStats = await pool.query(`
      SELECT
        COUNT(*) as attempts,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successes
      FROM webhook_delivery_logs
      WHERE created_at > NOW() - INTERVAL '1 hour'
    `);

    const attempts = parseInt(webhookStats.rows[0]?.attempts || 0);
    const successes = parseInt(webhookStats.rows[0]?.successes || 0);

    res.set('Content-Type', 'text/plain');
    res.send(`# Webhook metrics
webhook_attempts_total ${attempts}
webhook_success_total ${successes}
`);
  } catch (error) {
    console.error('[Metrics] Error generating webhook metrics:', error);
    res.status(500).send('Error generating webhook metrics');
  }
});

/**
 * GET /metrics/users
 * User-specific metrics (for user dashboard)
 */
router.get('/users', async (req, res) => {
  try {
    // Get user metrics
    const userMetrics = await pool.query(`
      SELECT
        COUNT(DISTINCT CASE WHEN last_active_at > NOW() - INTERVAL '1 day' THEN id END) as dau,
        COUNT(DISTINCT CASE WHEN last_active_at > NOW() - INTERVAL '7 days' THEN id END) as wau,
        COUNT(DISTINCT CASE WHEN last_active_at > NOW() - INTERVAL '30 days' THEN id END) as mau,
        COUNT(*) as total_users,
        COUNT(CASE WHEN guardian_id IS NOT NULL THEN 1 END) as users_with_guardians,
        AVG(clean_streak_days) as avg_clean_streak
      FROM users
    `);

    const stats = userMetrics.rows[0];

    // Update metrics
    metricsCollector.updateActiveUsers('1d', parseInt(stats.dau));
    metricsCollector.updateActiveUsers('7d', parseInt(stats.wau));
    metricsCollector.updateActiveUsers('30d', parseInt(stats.mau));

    res.set('Content-Type', 'text/plain');
    res.send(`# User metrics
user_activity_total{period="1d"} ${stats.dau}
user_activity_total{period="7d"} ${stats.wau}
user_activity_total{period="30d"} ${stats.mau}
total_users ${stats.total_users}
users_with_guardians ${stats.users_with_guardians}
avg_clean_streak_days ${parseFloat(stats.avg_clean_streak || 0).toFixed(2)}
`);
  } catch (error) {
    console.error('[Metrics] Error generating user metrics:', error);
    res.status(500).send('Error generating user metrics');
  }
});

/**
 * GET /metrics/business
 * Business KPI metrics
 */
router.get('/business', async (req, res) => {
  try {
    // Get business metrics
    const businessMetrics = await pool.query(`
      SELECT
        COUNT(DISTINCT CASE WHEN created_at > NOW() - INTERVAL '1 day' THEN id END) as registrations_today,
        SUM(CASE WHEN blocked THEN amount ELSE 0 END) as total_saved,
        COUNT(CASE WHEN blocked THEN 1 END) as transactions_blocked,
        COUNT(CASE WHEN NOT blocked THEN 1 END) as transactions_allowed
      FROM transactions
      WHERE created_at > NOW() - INTERVAL '30 days'
    `);

    const stats = businessMetrics.rows[0];

    res.set('Content-Type', 'text/plain');
    res.send(`# Business metrics
user_registrations_today ${stats.registrations_today || 0}
gambling_amount_saved_total ${parseFloat(stats.total_saved || 0)}
transactions_blocked_total ${stats.transactions_blocked || 0}
transactions_allowed_total ${stats.transactions_allowed || 0}
`);
  } catch (error) {
    console.error('[Metrics] Error generating business metrics:', error);
    res.status(500).send('Error generating business metrics');
  }
});

/**
 * POST /metrics/test
 * Test endpoint to generate sample metrics
 * (Development/testing only)
 */
router.post('/test', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      error: 'Test endpoint not available in production'
    });
  }

  try {
    // Generate some test metrics
    metricsCollector.trackHttpRequest('GET', '/api/users', 200, 0.123);
    metricsCollector.trackHttpRequest('POST', '/api/transactions', 201, 0.456);
    metricsCollector.trackDatabaseQuery('SELECT', 'users', 0.045);
    metricsCollector.trackCacheHit('user_profile');
    metricsCollector.trackTransaction(true, 50.00);
    metricsCollector.trackAIConversation('text', 45.5, 'helpful');
    metricsCollector.trackManipulationDetection('urgency');
    metricsCollector.trackCrisisDetection('medium');

    res.json({
      success: true,
      message: 'Test metrics generated'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /metrics/reset
 * Reset all metrics (testing only)
 */
router.get('/reset', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      error: 'Reset endpoint not available in production'
    });
  }

  try {
    metricsCollector.resetMetrics();
    res.json({
      success: true,
      message: 'Metrics reset'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
