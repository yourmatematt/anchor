/**
 * Security Monitor Service
 *
 * Monitors and detects security threats in real-time
 * Tracks: Failed logins, unusual access, injection attempts, session hijacking
 */

const metricsCollector = require('./metrics-collector');
const auditLogger = require('./audit-logger');

// Security event types
const SECURITY_EVENT = {
  FAILED_LOGIN: 'failed_login',
  MULTIPLE_FAILED_LOGINS: 'multiple_failed_logins',
  UNUSUAL_ACCESS_PATTERN: 'unusual_access_pattern',
  GEOGRAPHIC_ANOMALY: 'geographic_anomaly',
  SESSION_HIJACKING: 'session_hijacking_attempt',
  SQL_INJECTION: 'sql_injection_attempt',
  XSS_ATTEMPT: 'xss_attempt',
  CSRF_ATTEMPT: 'csrf_attempt',
  BRUTE_FORCE: 'brute_force_detected',
  ACCOUNT_LOCKOUT: 'account_lockout',
  SUSPICIOUS_API_USAGE: 'suspicious_api_usage',
  UNAUTHORIZED_ACCESS: 'unauthorized_access_attempt',
  PASSWORD_SPRAY: 'password_spray_attack',
  CREDENTIAL_STUFFING: 'credential_stuffing'
};

// Severity levels
const SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Thresholds
const THRESHOLDS = {
  FAILED_LOGIN_COUNT: 5,          // Lockout after 5 failed attempts
  FAILED_LOGIN_WINDOW: 15 * 60,   // 15 minutes
  BRUTE_FORCE_COUNT: 10,          // 10 attempts from same IP
  BRUTE_FORCE_WINDOW: 5 * 60,     // 5 minutes
  PASSWORD_SPRAY_COUNT: 20,       // 20 different accounts
  PASSWORD_SPRAY_WINDOW: 30 * 60, // 30 minutes
  GEO_DISTANCE_KM: 500,           // 500km distance in < 1 hour is suspicious
  API_CALL_THRESHOLD: 100,        // 100 calls per minute per user
  SESSION_IP_CHANGE_THRESHOLD: 3  // Max IP changes per session
};

class SecurityMonitor {
  constructor() {
    // In-memory tracking (use Redis in production)
    this.failedLoginAttempts = new Map(); // userId -> [{timestamp, ip}]
    this.ipAttempts = new Map();          // ip -> [{timestamp, userId}]
    this.userSessions = new Map();        // sessionId -> {userId, ips: [], lastLocation}
    this.apiCallCounts = new Map();       // userId -> {count, resetTime}
    this.blockedIPs = new Set();
    this.blockedUsers = new Set();

    // Start cleanup interval
    this._startCleanup();
  }

  /**
   * Track login attempt
   */
  async trackLoginAttempt(userId, ip, userAgent, success) {
    const timestamp = Date.now();

    if (!success) {
      // Track failed login
      await this._trackFailedLogin(userId, ip, timestamp);

      // Check for brute force
      await this._checkBruteForce(ip, timestamp);

      // Check for password spray
      await this._checkPasswordSpray(ip, userId, timestamp);

      // Log event
      await auditLogger.logSecurityEvent({
        event: SECURITY_EVENT.FAILED_LOGIN,
        severity: SEVERITY.LOW,
        userId,
        ip,
        userAgent,
        timestamp
      });

      return { blocked: false, remainingAttempts: this._getRemainingAttempts(userId) };
    }

    // Successful login - clear failed attempts
    this.failedLoginAttempts.delete(userId);

    return { blocked: false };
  }

  /**
   * Track failed login
   */
  async _trackFailedLogin(userId, ip, timestamp) {
    // Track by user
    if (!this.failedLoginAttempts.has(userId)) {
      this.failedLoginAttempts.set(userId, []);
    }

    const attempts = this.failedLoginAttempts.get(userId);
    attempts.push({ timestamp, ip });

    // Remove old attempts (outside window)
    const cutoff = timestamp - (THRESHOLDS.FAILED_LOGIN_WINDOW * 1000);
    const recentAttempts = attempts.filter(a => a.timestamp > cutoff);
    this.failedLoginAttempts.set(userId, recentAttempts);

    // Check if should lock account
    if (recentAttempts.length >= THRESHOLDS.FAILED_LOGIN_COUNT) {
      await this._lockAccount(userId, ip);
    }
  }

  /**
   * Lock account due to too many failed attempts
   */
  async _lockAccount(userId, ip) {
    this.blockedUsers.add(userId);

    await auditLogger.logSecurityEvent({
      event: SECURITY_EVENT.ACCOUNT_LOCKOUT,
      severity: SEVERITY.HIGH,
      userId,
      ip,
      message: `Account locked after ${THRESHOLDS.FAILED_LOGIN_COUNT} failed login attempts`,
      timestamp: Date.now()
    });

    // Alert security team
    await this._sendAlert({
      type: SECURITY_EVENT.ACCOUNT_LOCKOUT,
      severity: SEVERITY.HIGH,
      userId,
      ip
    });

    // Auto-unlock after 1 hour (in production, require manual unlock or email verification)
    setTimeout(() => {
      this.blockedUsers.delete(userId);
      console.log(`[SecurityMonitor] Account ${userId} auto-unlocked`);
    }, 60 * 60 * 1000);
  }

  /**
   * Check for brute force attack
   */
  async _checkBruteForce(ip, timestamp) {
    if (!this.ipAttempts.has(ip)) {
      this.ipAttempts.set(ip, []);
    }

    const attempts = this.ipAttempts.get(ip);
    attempts.push({ timestamp });

    // Remove old attempts
    const cutoff = timestamp - (THRESHOLDS.BRUTE_FORCE_WINDOW * 1000);
    const recentAttempts = attempts.filter(a => a.timestamp > cutoff);
    this.ipAttempts.set(ip, recentAttempts);

    // Check if brute force detected
    if (recentAttempts.length >= THRESHOLDS.BRUTE_FORCE_COUNT) {
      await this._blockIP(ip, 'Brute force attack detected');
    }
  }

  /**
   * Check for password spray attack
   */
  async _checkPasswordSpray(ip, userId, timestamp) {
    const attempts = this.ipAttempts.get(ip) || [];
    const cutoff = timestamp - (THRESHOLDS.PASSWORD_SPRAY_WINDOW * 1000);
    const recentAttempts = attempts.filter(a => a.timestamp > cutoff);

    // Count unique user IDs
    const uniqueUsers = new Set(recentAttempts.map(a => a.userId).filter(Boolean));

    if (uniqueUsers.size >= THRESHOLDS.PASSWORD_SPRAY_COUNT) {
      await this._blockIP(ip, 'Password spray attack detected');

      await auditLogger.logSecurityEvent({
        event: SECURITY_EVENT.PASSWORD_SPRAY,
        severity: SEVERITY.CRITICAL,
        ip,
        affectedUsers: Array.from(uniqueUsers),
        timestamp
      });
    }
  }

  /**
   * Block IP address
   */
  async _blockIP(ip, reason) {
    this.blockedIPs.add(ip);

    await auditLogger.logSecurityEvent({
      event: SECURITY_EVENT.BRUTE_FORCE,
      severity: SEVERITY.CRITICAL,
      ip,
      message: reason,
      timestamp: Date.now()
    });

    // Alert security team
    await this._sendAlert({
      type: SECURITY_EVENT.BRUTE_FORCE,
      severity: SEVERITY.CRITICAL,
      ip,
      reason
    });

    console.log(`[SecurityMonitor] IP ${ip} blocked: ${reason}`);

    // Auto-unblock after 24 hours
    setTimeout(() => {
      this.blockedIPs.delete(ip);
      console.log(`[SecurityMonitor] IP ${ip} auto-unblocked`);
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Check if IP is blocked
   */
  isIPBlocked(ip) {
    return this.blockedIPs.has(ip);
  }

  /**
   * Check if user is blocked
   */
  isUserBlocked(userId) {
    return this.blockedUsers.has(userId);
  }

  /**
   * Get remaining login attempts
   */
  _getRemainingAttempts(userId) {
    const attempts = this.failedLoginAttempts.get(userId) || [];
    return Math.max(0, THRESHOLDS.FAILED_LOGIN_COUNT - attempts.length);
  }

  /**
   * Track session activity
   */
  async trackSessionActivity(sessionId, userId, ip, location) {
    if (!this.userSessions.has(sessionId)) {
      this.userSessions.set(sessionId, {
        userId,
        ips: [ip],
        locations: [location],
        createdAt: Date.now()
      });
      return { suspicious: false };
    }

    const session = this.userSessions.get(sessionId);

    // Check for IP change
    if (!session.ips.includes(ip)) {
      session.ips.push(ip);

      // Too many IP changes
      if (session.ips.length > THRESHOLDS.SESSION_IP_CHANGE_THRESHOLD) {
        await auditLogger.logSecurityEvent({
          event: SECURITY_EVENT.SESSION_HIJACKING,
          severity: SEVERITY.HIGH,
          userId,
          sessionId,
          ips: session.ips,
          timestamp: Date.now()
        });

        return { suspicious: true, reason: 'Multiple IP changes' };
      }
    }

    // Check geographic anomaly
    if (location && session.locations.length > 0) {
      const lastLocation = session.locations[session.locations.length - 1];
      const distance = this._calculateDistance(lastLocation, location);
      const timeDiff = (Date.now() - session.createdAt) / 1000 / 60 / 60; // hours

      // Impossible travel
      if (distance > THRESHOLDS.GEO_DISTANCE_KM && timeDiff < 1) {
        await auditLogger.logSecurityEvent({
          event: SECURITY_EVENT.GEOGRAPHIC_ANOMALY,
          severity: SEVERITY.HIGH,
          userId,
          sessionId,
          distance: `${distance}km`,
          timeDiff: `${timeDiff.toFixed(2)}h`,
          timestamp: Date.now()
        });

        return { suspicious: true, reason: 'Impossible travel detected' };
      }

      session.locations.push(location);
    }

    return { suspicious: false };
  }

  /**
   * Calculate distance between two locations (Haversine formula)
   */
  _calculateDistance(loc1, loc2) {
    if (!loc1 || !loc2 || !loc1.lat || !loc2.lat) return 0;

    const R = 6371; // Earth's radius in km
    const dLat = this._toRad(loc2.lat - loc1.lat);
    const dLon = this._toRad(loc2.lon - loc1.lon);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this._toRad(loc1.lat)) * Math.cos(this._toRad(loc2.lat)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  _toRad(deg) {
    return deg * (Math.PI / 180);
  }

  /**
   * Detect SQL injection attempts
   */
  detectSQLInjection(input, userId, ip) {
    const sqlPatterns = [
      /(\bOR\b|\bAND\b).*=.*\d+/i,
      /UNION.*SELECT/i,
      /SELECT.*FROM.*WHERE/i,
      /DROP.*TABLE/i,
      /INSERT.*INTO/i,
      /DELETE.*FROM/i,
      /UPDATE.*SET/i,
      /';.*--/,
      /\/\*.*\*\//,
      /\bEXEC\b|\bEXECUTE\b/i
    ];

    for (const pattern of sqlPatterns) {
      if (pattern.test(input)) {
        auditLogger.logSecurityEvent({
          event: SECURITY_EVENT.SQL_INJECTION,
          severity: SEVERITY.CRITICAL,
          userId,
          ip,
          input: input.substring(0, 200), // Log first 200 chars
          pattern: pattern.toString(),
          timestamp: Date.now()
        });

        this._sendAlert({
          type: SECURITY_EVENT.SQL_INJECTION,
          severity: SEVERITY.CRITICAL,
          userId,
          ip,
          input: input.substring(0, 100)
        });

        return true;
      }
    }

    return false;
  }

  /**
   * Detect XSS attempts
   */
  detectXSS(input, userId, ip) {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi, // onload=, onclick=, etc.
      /<iframe/gi,
      /<object/gi,
      /<embed/gi,
      /eval\(/gi,
      /expression\(/gi
    ];

    for (const pattern of xssPatterns) {
      if (pattern.test(input)) {
        auditLogger.logSecurityEvent({
          event: SECURITY_EVENT.XSS_ATTEMPT,
          severity: SEVERITY.HIGH,
          userId,
          ip,
          input: input.substring(0, 200),
          pattern: pattern.toString(),
          timestamp: Date.now()
        });

        return true;
      }
    }

    return false;
  }

  /**
   * Track API usage
   */
  async trackAPIUsage(userId, endpoint) {
    const now = Date.now();
    const key = `${userId}_${endpoint}`;

    if (!this.apiCallCounts.has(key)) {
      this.apiCallCounts.set(key, { count: 0, resetTime: now + 60000 });
    }

    const usage = this.apiCallCounts.get(key);

    // Reset if window expired
    if (now > usage.resetTime) {
      usage.count = 0;
      usage.resetTime = now + 60000;
    }

    usage.count++;

    // Check for abuse
    if (usage.count > THRESHOLDS.API_CALL_THRESHOLD) {
      await auditLogger.logSecurityEvent({
        event: SECURITY_EVENT.SUSPICIOUS_API_USAGE,
        severity: SEVERITY.MEDIUM,
        userId,
        endpoint,
        callCount: usage.count,
        timestamp: now
      });

      return { abuse: true, remaining: 0 };
    }

    return { abuse: false, remaining: THRESHOLDS.API_CALL_THRESHOLD - usage.count };
  }

  /**
   * Send security alert
   */
  async _sendAlert(alert) {
    // In production: Send to PagerDuty, Slack, email, etc.
    console.log('[SecurityMonitor] ALERT:', alert);

    // Track metric
    if (metricsCollector) {
      // metricsCollector.trackSecurityEvent(alert.type, alert.severity);
    }
  }

  /**
   * Cleanup old tracking data
   */
  _startCleanup() {
    setInterval(() => {
      const now = Date.now();

      // Cleanup failed login attempts
      for (const [userId, attempts] of this.failedLoginAttempts.entries()) {
        const cutoff = now - (THRESHOLDS.FAILED_LOGIN_WINDOW * 1000);
        const recent = attempts.filter(a => a.timestamp > cutoff);
        if (recent.length === 0) {
          this.failedLoginAttempts.delete(userId);
        } else {
          this.failedLoginAttempts.set(userId, recent);
        }
      }

      // Cleanup IP attempts
      for (const [ip, attempts] of this.ipAttempts.entries()) {
        const cutoff = now - (THRESHOLDS.BRUTE_FORCE_WINDOW * 1000);
        const recent = attempts.filter(a => a.timestamp > cutoff);
        if (recent.length === 0) {
          this.ipAttempts.delete(ip);
        } else {
          this.ipAttempts.set(ip, recent);
        }
      }

      // Cleanup old sessions
      for (const [sessionId, session] of this.userSessions.entries()) {
        if (now - session.createdAt > 24 * 60 * 60 * 1000) { // 24 hours
          this.userSessions.delete(sessionId);
        }
      }

      // Cleanup API call counts
      for (const [key, usage] of this.apiCallCounts.entries()) {
        if (now > usage.resetTime + 60000) {
          this.apiCallCounts.delete(key);
        }
      }

      console.log('[SecurityMonitor] Cleanup complete');
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Get security statistics
   */
  getStatistics() {
    return {
      blockedIPs: this.blockedIPs.size,
      blockedUsers: this.blockedUsers.size,
      activeFailedLoginAttempts: this.failedLoginAttempts.size,
      activeSessions: this.userSessions.size,
      trackedIPs: this.ipAttempts.size
    };
  }

  /**
   * Manually unblock IP
   */
  unblockIP(ip) {
    this.blockedIPs.delete(ip);
    console.log(`[SecurityMonitor] IP ${ip} manually unblocked`);
  }

  /**
   * Manually unblock user
   */
  unblockUser(userId) {
    this.blockedUsers.delete(userId);
    this.failedLoginAttempts.delete(userId);
    console.log(`[SecurityMonitor] User ${userId} manually unblocked`);
  }
}

// Export singleton instance
const securityMonitor = new SecurityMonitor();
module.exports = securityMonitor;

// Export class and constants for testing
module.exports.SecurityMonitor = SecurityMonitor;
module.exports.SECURITY_EVENT = SECURITY_EVENT;
module.exports.SEVERITY = SEVERITY;
module.exports.THRESHOLDS = THRESHOLDS;
