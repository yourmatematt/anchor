/**
 * Advanced Rate Limiter
 *
 * Features:
 * - Sliding window algorithm
 * - Per-user and per-endpoint limits
 * - Cost-based throttling
 * - Burst allowances
 * - Distributed rate limiting (Redis-ready)
 */

const Redis = require('ioredis');

// Rate limit configurations
const LIMITS = {
  // Global limits
  GLOBAL_PER_IP: { requests: 100, window: 60 }, // 100 req/min per IP

  // Per-endpoint limits
  LOGIN: { requests: 5, window: 300, cost: 10 }, // 5 login attempts per 5 min
  REGISTRATION: { requests: 3, window: 3600, cost: 20 }, // 3 registrations per hour
  API_CALL: { requests: 60, window: 60, cost: 1 }, // 60 calls per minute
  AI_CONVERSATION: { requests: 20, window: 3600, cost: 5 }, // 20 conversations per hour
  PAYMENT_REQUEST: { requests: 10, window: 86400, cost: 15 }, // 10 payment requests per day
  PATTERN_DETECTION: { requests: 100, window: 3600, cost: 2 }, // 100 per hour
  GUARDIAN_MESSAGE: { requests: 50, window: 3600, cost: 3 }, // 50 per hour

  // Per-user limits
  USER_API_CALLS: { requests: 1000, window: 3600, cost: 1 }, // 1000 per hour
  USER_TRANSACTIONS: { requests: 100, window: 86400, cost: 2 }, // 100 per day

  // Burst allowances
  BURST_LOGIN: 3, // Allow 3 rapid login attempts
  BURST_API: 10   // Allow 10 rapid API calls
};

class AdvancedRateLimiter {
  constructor(redisClient = null) {
    this.redis = redisClient;
    // Fallback to in-memory if no Redis
    this.memory = new Map();
    this.whitelist = new Set();
  }

  /**
   * Check rate limit using sliding window algorithm
   */
  async checkLimit(key, limit, burstAllowance = 0) {
    const now = Date.now();
    const windowStart = now - (limit.window * 1000);

    if (this.redis) {
      return await this._checkLimitRedis(key, limit, windowStart, now, burstAllowance);
    } else {
      return await this._checkLimitMemory(key, limit, windowStart, now, burstAllowance);
    }
  }

  /**
   * Redis-based rate limiting (distributed)
   */
  async _checkLimitRedis(key, limit, windowStart, now, burstAllowance) {
    const requests = await this.redis.zrangebyscore(key, windowStart, '+inf');
    const currentCount = requests.length;

    // Check if limit exceeded
    if (currentCount >= limit.requests + burstAllowance) {
      const oldestRequest = requests[0];
      const resetTime = parseInt(oldestRequest) + (limit.window * 1000);

      return {
        allowed: false,
        limit: limit.requests,
        remaining: 0,
        resetTime,
        retryAfter: Math.ceil((resetTime - now) / 1000)
      };
    }

    // Add current request
    await this.redis.zadd(key, now, `${now}-${Math.random()}`);

    // Clean up old requests
    await this.redis.zremrangebyscore(key, '-inf', windowStart);

    // Set expiry on key
    await this.redis.expire(key, limit.window);

    return {
      allowed: true,
      limit: limit.requests,
      remaining: limit.requests - currentCount - 1,
      resetTime: now + (limit.window * 1000)
    };
  }

  /**
   * Memory-based rate limiting (single server)
   */
  async _checkLimitMemory(key, limit, windowStart, now, burstAllowance) {
    if (!this.memory.has(key)) {
      this.memory.set(key, []);
    }

    let requests = this.memory.get(key);

    // Remove old requests
    requests = requests.filter(timestamp => timestamp > windowStart);
    this.memory.set(key, requests);

    const currentCount = requests.length;

    // Check if limit exceeded
    if (currentCount >= limit.requests + burstAllowance) {
      const oldestRequest = requests[0];
      const resetTime = oldestRequest + (limit.window * 1000);

      return {
        allowed: false,
        limit: limit.requests,
        remaining: 0,
        resetTime,
        retryAfter: Math.ceil((resetTime - now) / 1000)
      };
    }

    // Add current request
    requests.push(now);

    return {
      allowed: true,
      limit: limit.requests,
      remaining: limit.requests - currentCount - 1,
      resetTime: now + (limit.window * 1000)
    };
  }

  /**
   * Cost-based rate limiting
   */
  async checkCostLimit(userId, endpoint, customCost = null) {
    const limit = LIMITS[endpoint] || LIMITS.API_CALL;
    const cost = customCost || limit.cost || 1;

    const key = `cost:${userId}:${endpoint}`;
    const budget = limit.requests * limit.cost;
    const now = Date.now();
    const windowStart = now - (limit.window * 1000);

    // Get current cost total
    const requests = this.memory.get(key) || [];
    const recentRequests = requests.filter(r => r.timestamp > windowStart);
    const currentCost = recentRequests.reduce((sum, r) => sum + r.cost, 0);

    // Check if budget exceeded
    if (currentCost + cost > budget) {
      return {
        allowed: false,
        budget,
        spent: currentCost,
        cost,
        remaining: 0,
        resetTime: requests[0]?.timestamp + (limit.window * 1000) || now
      };
    }

    // Add current cost
    recentRequests.push({ timestamp: now, cost });
    this.memory.set(key, recentRequests);

    return {
      allowed: true,
      budget,
      spent: currentCost + cost,
      remaining: budget - currentCost - cost,
      resetTime: now + (limit.window * 1000)
    };
  }

  /**
   * Express middleware for rate limiting
   */
  middleware(endpointType = 'API_CALL') {
    return async (req, res, next) => {
      // Check whitelist
      if (this.whitelist.has(req.ip) || this.whitelist.has(req.user?.id)) {
        return next();
      }

      const userId = req.user?.id || req.ip;
      const key = `ratelimit:${endpointType}:${userId}`;
      const limit = LIMITS[endpointType] || LIMITS.API_CALL;
      const burst = LIMITS[`BURST_${endpointType}`] || 0;

      const result = await this.checkLimit(key, limit, burst);

      // Set rate limit headers
      res.set('X-RateLimit-Limit', result.limit);
      res.set('X-RateLimit-Remaining', result.remaining);
      res.set('X-RateLimit-Reset', result.resetTime);

      if (!result.allowed) {
        res.set('Retry-After', result.retryAfter);
        return res.status(429).json({
          error: 'Too many requests',
          message: `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
          limit: result.limit,
          retryAfter: result.retryAfter
        });
      }

      next();
    };
  }

  /**
   * Add to whitelist
   */
  addToWhitelist(identifier) {
    this.whitelist.add(identifier);
  }

  /**
   * Remove from whitelist
   */
  removeFromWhitelist(identifier) {
    this.whitelist.delete(identifier);
  }

  /**
   * Clear rate limit for user/IP
   */
  clearLimit(key) {
    this.memory.delete(key);
    if (this.redis) {
      this.redis.del(key);
    }
  }
}

module.exports = new AdvancedRateLimiter();
module.exports.AdvancedRateLimiter = AdvancedRateLimiter;
module.exports.LIMITS = LIMITS;
