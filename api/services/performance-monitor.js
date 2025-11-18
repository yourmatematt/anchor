/**
 * Performance Monitor Service
 *
 * Middleware and utilities for tracking application performance
 * Automatically instruments requests, database queries, and external API calls
 */

const metricsCollector = require('./metrics-collector');

class PerformanceMonitor {
  /**
   * Express middleware for HTTP request tracking
   */
  static requestTracker() {
    return (req, res, next) => {
      const startTime = process.hrtime.bigint();

      // Capture response finish event
      res.on('finish', () => {
        const endTime = process.hrtime.bigint();
        const durationSeconds = Number(endTime - startTime) / 1e9;

        // Normalize endpoint to avoid high cardinality
        const endpoint = PerformanceMonitor._normalizeEndpoint(req.route?.path || req.path);

        metricsCollector.trackHttpRequest(
          req.method,
          endpoint,
          res.statusCode,
          durationSeconds
        );
      });

      next();
    };
  }

  /**
   * Normalize endpoint to reduce cardinality
   * Converts /users/123/transactions to /users/:id/transactions
   */
  static _normalizeEndpoint(path) {
    return path
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:uuid')
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9]{24}/g, '/:id'); // MongoDB ObjectId
  }

  /**
   * Wrap database query with performance tracking
   */
  static async trackDatabaseQuery(queryType, table, queryFn) {
    const startTime = process.hrtime.bigint();

    try {
      const result = await queryFn();
      const endTime = process.hrtime.bigint();
      const durationSeconds = Number(endTime - startTime) / 1e9;

      metricsCollector.trackDatabaseQuery(queryType, table, durationSeconds);

      return result;
    } catch (error) {
      const endTime = process.hrtime.bigint();
      const durationSeconds = Number(endTime - startTime) / 1e9;

      metricsCollector.trackDatabaseQuery(queryType, table, durationSeconds);
      throw error;
    }
  }

  /**
   * Wrap third-party API call with performance tracking
   */
  static async trackThirdPartyApi(provider, endpoint, apiFn) {
    const startTime = process.hrtime.bigint();

    try {
      const result = await apiFn();
      const endTime = process.hrtime.bigint();
      const durationSeconds = Number(endTime - startTime) / 1e9;

      metricsCollector.trackThirdPartyApi(provider, endpoint, durationSeconds);

      return result;
    } catch (error) {
      const endTime = process.hrtime.bigint();
      const durationSeconds = Number(endTime - startTime) / 1e9;

      metricsCollector.trackThirdPartyApi(provider, endpoint, durationSeconds);
      throw error;
    }
  }

  /**
   * Wrap AI conversation with tracking
   */
  static async trackAIConversation(inputType, conversationFn) {
    const startTime = process.hrtime.bigint();

    try {
      const result = await conversationFn();
      const endTime = process.hrtime.bigint();
      const durationSeconds = Number(endTime - startTime) / 1e9;

      metricsCollector.trackAIConversation(
        inputType,
        durationSeconds,
        result.outcome || 'neutral'
      );

      return result;
    } catch (error) {
      const endTime = process.hrtime.bigint();
      const durationSeconds = Number(endTime - startTime) / 1e9;

      metricsCollector.trackAIConversation(
        inputType,
        durationSeconds,
        'error'
      );

      throw error;
    }
  }

  /**
   * Wrap ML model inference with tracking
   */
  static async trackMLInference(model, operation, inferenceFn) {
    const startTime = process.hrtime.bigint();

    try {
      const result = await inferenceFn();
      const endTime = process.hrtime.bigint();
      const durationSeconds = Number(endTime - startTime) / 1e9;

      metricsCollector.trackMLInference(model, operation, durationSeconds);

      return result;
    } catch (error) {
      const endTime = process.hrtime.bigint();
      const durationSeconds = Number(endTime - startTime) / 1e9;

      metricsCollector.trackMLInference(model, operation, durationSeconds);

      // Track error
      metricsCollector.aiModelError
        .labels(error.name || 'UnknownError', model)
        .inc();

      throw error;
    }
  }

  /**
   * Cache decorator for functions
   */
  static cacheDecorator(cacheType) {
    return (target, propertyKey, descriptor) => {
      const originalMethod = descriptor.value;

      descriptor.value = async function (...args) {
        const cacheKey = `${propertyKey}_${JSON.stringify(args)}`;

        // Try cache first
        const cached = await this.cache?.get(cacheKey);
        if (cached) {
          metricsCollector.trackCacheHit(cacheType);
          return cached;
        }

        // Cache miss
        metricsCollector.trackCacheMiss(cacheType);

        // Execute original method
        const result = await originalMethod.apply(this, args);

        // Store in cache
        if (this.cache) {
          await this.cache.set(cacheKey, result);
        }

        return result;
      };

      return descriptor;
    };
  }

  /**
   * Performance timer utility
   */
  static createTimer() {
    const startTime = process.hrtime.bigint();

    return {
      stop: () => {
        const endTime = process.hrtime.bigint();
        return Number(endTime - startTime) / 1e9; // Return seconds
      },
      stopMs: () => {
        const endTime = process.hrtime.bigint();
        return Number(endTime - startTime) / 1e6; // Return milliseconds
      }
    };
  }

  /**
   * Monitor function performance
   */
  static async monitorFunction(name, fn, labels = {}) {
    const timer = PerformanceMonitor.createTimer();

    try {
      const result = await fn();
      const duration = timer.stop();

      console.log(`[Performance] ${name}: ${duration.toFixed(3)}s`, labels);

      return result;
    } catch (error) {
      const duration = timer.stop();
      console.error(`[Performance] ${name} failed after ${duration.toFixed(3)}s`, labels, error);
      throw error;
    }
  }

  /**
   * Batch metric updates
   */
  static batchUpdate(updates) {
    for (const update of updates) {
      const { type, ...params } = update;

      switch (type) {
        case 'http_request':
          metricsCollector.trackHttpRequest(
            params.method,
            params.endpoint,
            params.statusCode,
            params.duration
          );
          break;

        case 'database_query':
          metricsCollector.trackDatabaseQuery(
            params.queryType,
            params.table,
            params.duration
          );
          break;

        case 'cache_hit':
          metricsCollector.trackCacheHit(params.cacheType);
          break;

        case 'cache_miss':
          metricsCollector.trackCacheMiss(params.cacheType);
          break;

        case 'transaction':
          metricsCollector.trackTransaction(params.blocked, params.amount);
          break;

        case 'intervention':
          metricsCollector.trackIntervention(params.type, params.success);
          break;

        case 'pattern_detection':
          metricsCollector.trackPatternDetection(
            params.patternType,
            params.correct,
            params.confidence
          );
          break;

        default:
          console.warn(`Unknown metric type: ${type}`);
      }
    }
  }

  /**
   * Get performance summary
   */
  static async getPerformanceSummary() {
    const metrics = await metricsCollector.getMetricsJSON();

    const summary = {
      http: {
        totalRequests: 0,
        avgDuration: 0,
        errorRate: 0
      },
      database: {
        totalQueries: 0,
        avgDuration: 0
      },
      cache: {
        hitRate: 0,
        totalHits: 0,
        totalMisses: 0
      },
      ai: {
        totalConversations: 0,
        avgDuration: 0,
        totalCost: 0
      }
    };

    // Parse metrics to calculate summary
    for (const metric of metrics) {
      if (metric.name === 'http_requests_total') {
        summary.http.totalRequests = metric.values?.reduce((sum, v) => sum + v.value, 0) || 0;
      }
      if (metric.name === 'cache_hits_total') {
        summary.cache.totalHits = metric.values?.reduce((sum, v) => sum + v.value, 0) || 0;
      }
      if (metric.name === 'cache_misses_total') {
        summary.cache.totalMisses = metric.values?.reduce((sum, v) => sum + v.value, 0) || 0;
      }
      if (metric.name === 'ai_conversation_total') {
        summary.ai.totalConversations = metric.values?.reduce((sum, v) => sum + v.value, 0) || 0;
      }
      if (metric.name === 'ai_cost_total') {
        summary.ai.totalCost = metric.values?.reduce((sum, v) => sum + v.value, 0) || 0;
      }
    }

    // Calculate cache hit rate
    const totalCacheOps = summary.cache.totalHits + summary.cache.totalMisses;
    summary.cache.hitRate = totalCacheOps > 0
      ? (summary.cache.totalHits / totalCacheOps) * 100
      : 0;

    return summary;
  }

  /**
   * Health check helper
   */
  static async healthCheck() {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {}
    };

    try {
      // Check metrics collection
      const metrics = await metricsCollector.getMetrics();
      health.checks.metrics = {
        status: metrics ? 'ok' : 'error',
        message: metrics ? 'Metrics collection working' : 'No metrics available'
      };

      // Check memory usage
      const memUsage = process.memoryUsage();
      const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      health.checks.memory = {
        status: memUsagePercent < 90 ? 'ok' : 'warning',
        heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
        usagePercent: Math.round(memUsagePercent)
      };

      // Check uptime
      const uptimeSeconds = process.uptime();
      health.checks.uptime = {
        status: 'ok',
        seconds: Math.round(uptimeSeconds),
        formatted: PerformanceMonitor._formatUptime(uptimeSeconds)
      };

    } catch (error) {
      health.status = 'unhealthy';
      health.error = error.message;
    }

    return health;
  }

  /**
   * Format uptime for display
   */
  static _formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);

    return parts.join(' ') || '< 1m';
  }

  /**
   * Create alert
   */
  static createAlert(severity, message, details = {}) {
    console.log(`[ALERT] [${severity}] ${message}`, details);

    // In production, send to alerting service (PagerDuty, etc.)
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to PagerDuty/Opsgenie/etc.
    }
  }

  /**
   * Log slow operation
   */
  static logSlowOperation(operation, durationSeconds, threshold = 1.0) {
    if (durationSeconds > threshold) {
      console.warn(`[SLOW OPERATION] ${operation} took ${durationSeconds.toFixed(3)}s`);

      // Create alert for very slow operations
      if (durationSeconds > threshold * 5) {
        PerformanceMonitor.createAlert(
          'warning',
          `Very slow operation detected: ${operation}`,
          { duration: durationSeconds, threshold }
        );
      }
    }
  }
}

module.exports = PerformanceMonitor;
