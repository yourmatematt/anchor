/**
 * Fraud Detection Engine
 *
 * Detects and prevents fraudulent activity:
 * - Multiple account creation
 * - Account sharing
 * - VPN/proxy usage
 * - Fake guardian accounts
 * - Payment request fraud
 * - Identity verification bypass
 */

const auditLogger = require('./audit-logger');
const crypto = require('crypto');

// Fraud types
const FRAUD_TYPE = {
  MULTIPLE_ACCOUNTS: 'multiple_accounts',
  ACCOUNT_SHARING: 'account_sharing',
  VPN_PROXY_USAGE: 'vpn_proxy_usage',
  FAKE_GUARDIAN: 'fake_guardian',
  PAYMENT_FRAUD: 'payment_request_fraud',
  IDENTITY_BYPASS: 'identity_verification_bypass',
  DEVICE_FARM: 'device_farm_detected',
  BOT_ACTIVITY: 'bot_activity',
  VELOCITY_ABUSE: 'velocity_abuse'
};

// Risk scores
const RISK_SCORE = {
  LOW: 0-30,
  MEDIUM: 31-60,
  HIGH: 61-85,
  CRITICAL: 86-100
};

// Thresholds
const THRESHOLDS = {
  MAX_ACCOUNTS_PER_DEVICE: 3,
  MAX_ACCOUNTS_PER_IP: 5,
  VPN_CONFIDENCE_THRESHOLD: 0.7,
  GUARDIAN_RESPONSE_TIME_MIN: 5, // 5 seconds minimum response time
  PAYMENT_FREQUENCY_LIMIT: 10,   // Max 10 payment requests per day
  DEVICE_FINGERPRINT_SIMILARITY: 0.9,
  BEHAVIORAL_SIMILARITY: 0.85
};

// Known VPN/Proxy IP ranges (sample - use commercial service in production)
const VPN_INDICATORS = [
  '10.', '172.16.', '192.168.', // Private IPs
  // Add known VPN provider IP ranges
];

class FraudDetector {
  constructor() {
    // Tracking maps (use Redis in production)
    this.deviceFingerprints = new Map(); // deviceId -> [{userId, timestamp, fingerprint}]
    this.ipAddresses = new Map();         // ip -> [{userId, timestamp}]
    this.guardianRelationships = new Map(); // guardianId -> [{userId, createdAt, interactions}]
    this.paymentRequests = new Map();     // userId -> [{amount, timestamp}]
    this.userBehavior = new Map();        // userId -> {patterns, timestamps}
    this.flaggedUsers = new Map();        // userId -> {fraudType, score, timestamp}
  }

  /**
   * Check for multiple account fraud
   */
  async checkMultipleAccounts(userId, deviceId, ip, deviceFingerprint) {
    const fraudIndicators = [];
    let riskScore = 0;

    // Check device fingerprint
    const deviceFraud = await this._checkDeviceFingerprint(userId, deviceId, deviceFingerprint);
    if (deviceFraud.fraud) {
      fraudIndicators.push(deviceFraud);
      riskScore += 30;
    }

    // Check IP address
    const ipFraud = await this._checkIPAddress(userId, ip);
    if (ipFraud.fraud) {
      fraudIndicators.push(ipFraud);
      riskScore += 25;
    }

    // Check for device farm patterns
    const deviceFarmFraud = await this._checkDeviceFarm(deviceId);
    if (deviceFarmFraud.fraud) {
      fraudIndicators.push(deviceFarmFraud);
      riskScore += 45;
    }

    if (fraudIndicators.length > 0) {
      await this._flagUser(userId, FRAUD_TYPE.MULTIPLE_ACCOUNTS, riskScore, fraudIndicators);
      return {
        fraud: true,
        type: FRAUD_TYPE.MULTIPLE_ACCOUNTS,
        riskScore,
        indicators: fraudIndicators
      };
    }

    return { fraud: false, riskScore: 0 };
  }

  /**
   * Check device fingerprint
   */
  async _checkDeviceFingerprint(userId, deviceId, fingerprint) {
    if (!this.deviceFingerprints.has(deviceId)) {
      this.deviceFingerprints.set(deviceId, []);
    }

    const devices = this.deviceFingerprints.get(deviceId);

    // Add current user
    devices.push({
      userId,
      timestamp: Date.now(),
      fingerprint
    });

    // Count unique users on this device
    const uniqueUsers = new Set(devices.map(d => d.userId));

    if (uniqueUsers.size > THRESHOLDS.MAX_ACCOUNTS_PER_DEVICE) {
      return {
        fraud: true,
        reason: `${uniqueUsers.size} accounts on same device`,
        deviceId,
        userIds: Array.from(uniqueUsers)
      };
    }

    // Check fingerprint similarity (detect device spoofing)
    for (const device of devices) {
      if (device.userId !== userId) {
        const similarity = this._calculateSimilarity(fingerprint, device.fingerprint);
        if (similarity > THRESHOLDS.DEVICE_FINGERPRINT_SIMILARITY) {
          return {
            fraud: true,
            reason: 'Highly similar device fingerprint detected',
            similarity,
            otherUserId: device.userId
          };
        }
      }
    }

    return { fraud: false };
  }

  /**
   * Check IP address
   */
  async _checkIPAddress(userId, ip) {
    if (!this.ipAddresses.has(ip)) {
      this.ipAddresses.set(ip, []);
    }

    const users = this.ipAddresses.get(ip);
    users.push({ userId, timestamp: Date.now() });

    // Count unique users from this IP in last 24 hours
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    const recentUsers = users.filter(u => u.timestamp > cutoff);
    const uniqueUsers = new Set(recentUsers.map(u => u.userId));

    if (uniqueUsers.size > THRESHOLDS.MAX_ACCOUNTS_PER_IP) {
      return {
        fraud: true,
        reason: `${uniqueUsers.size} accounts from same IP in 24 hours`,
        ip,
        userIds: Array.from(uniqueUsers)
      };
    }

    return { fraud: false };
  }

  /**
   * Check for device farm patterns
   */
  async _checkDeviceFarm(deviceId) {
    // Device farms often have sequential device IDs or similar patterns
    const devices = Array.from(this.deviceFingerprints.keys());

    // Check for sequential IDs
    const sequential = devices.filter(d => {
      const diff = Math.abs(parseInt(deviceId, 16) - parseInt(d, 16));
      return diff > 0 && diff < 100;
    });

    if (sequential.length > 10) {
      return {
        fraud: true,
        reason: 'Device farm pattern detected (sequential IDs)',
        deviceId,
        relatedDevices: sequential.slice(0, 5)
      };
    }

    return { fraud: false };
  }

  /**
   * Check for account sharing
   */
  async checkAccountSharing(userId, sessionData) {
    const indicators = [];
    let riskScore = 0;

    // Track user behavior patterns
    if (!this.userBehavior.has(userId)) {
      this.userBehavior.set(userId, {
        locations: [],
        devices: [],
        loginTimes: [],
        activityPatterns: []
      });
    }

    const behavior = this.userBehavior.get(userId);

    // Check for multiple simultaneous locations
    const { location, device, timestamp } = sessionData;
    if (location) {
      behavior.locations.push({ ...location, timestamp });

      // Check for simultaneous logins from different locations
      const recent = behavior.locations.filter(l =>
        Math.abs(l.timestamp - timestamp) < 5 * 60 * 1000 // Within 5 minutes
      );

      if (recent.length > 1) {
        const distances = recent.map(l =>
          this._calculateDistance(location, l)
        );
        const maxDistance = Math.max(...distances);

        if (maxDistance > 100) { // More than 100km apart
          indicators.push({
            reason: 'Simultaneous access from different locations',
            distance: `${maxDistance.toFixed(0)}km`,
            locations: recent.map(l => ({ lat: l.lat, lon: l.lon }))
          });
          riskScore += 40;
        }
      }
    }

    // Check for multiple devices
    if (device) {
      behavior.devices.push({ ...device, timestamp });

      const uniqueDevices = new Set(behavior.devices
        .filter(d => Date.now() - d.timestamp < 7 * 24 * 60 * 60 * 1000) // Last 7 days
        .map(d => d.deviceId)
      );

      if (uniqueDevices.size > 5) {
        indicators.push({
          reason: 'Too many devices used in short period',
          deviceCount: uniqueDevices.size
        });
        riskScore += 30;
      }
    }

    // Check behavioral patterns
    const behavioralFraud = await this._checkBehavioralPatterns(userId, behavior);
    if (behavioralFraud.fraud) {
      indicators.push(behavioralFraud);
      riskScore += 30;
    }

    if (indicators.length > 0) {
      await this._flagUser(userId, FRAUD_TYPE.ACCOUNT_SHARING, riskScore, indicators);
      return {
        fraud: true,
        type: FRAUD_TYPE.ACCOUNT_SHARING,
        riskScore,
        indicators
      };
    }

    return { fraud: false, riskScore: 0 };
  }

  /**
   * Check behavioral patterns
   */
  async _checkBehavioralPatterns(userId, behavior) {
    // Analyze login times, activity patterns, etc.
    // If patterns suddenly change drastically, it may indicate account sharing

    const recentActivity = behavior.activityPatterns.slice(-100);

    if (recentActivity.length < 20) {
      return { fraud: false }; // Not enough data
    }

    // Check for sudden changes in behavior
    const firstHalf = recentActivity.slice(0, Math.floor(recentActivity.length / 2));
    const secondHalf = recentActivity.slice(Math.floor(recentActivity.length / 2));

    const similarity = this._calculateBehaviorSimilarity(firstHalf, secondHalf);

    if (similarity < THRESHOLDS.BEHAVIORAL_SIMILARITY) {
      return {
        fraud: true,
        reason: 'Significant behavior pattern change detected',
        similarity
      };
    }

    return { fraud: false };
  }

  /**
   * Check for VPN/Proxy usage
   */
  async checkVPNProxyUsage(ip, userId) {
    let riskScore = 0;
    const indicators = [];

    // Check against known VPN IP ranges
    for (const indicator of VPN_INDICATORS) {
      if (ip.startsWith(indicator)) {
        indicators.push({
          reason: 'IP matches known VPN/Proxy range',
          ipRange: indicator
        });
        riskScore += 50;
      }
    }

    // Check for suspicious IP characteristics
    // In production: Use commercial IP intelligence service (IPQualityScore, MaxMind, etc.)
    const ipInfo = await this._getIPInfo(ip);

    if (ipInfo.vpn || ipInfo.proxy || ipInfo.tor) {
      indicators.push({
        reason: 'IP flagged as VPN/Proxy/Tor',
        ...ipInfo
      });
      riskScore += 60;
    }

    // Check for data center IPs (common for VPNs)
    if (ipInfo.hosting || ipInfo.datacenter) {
      indicators.push({
        reason: 'IP from data center/hosting provider',
        ...ipInfo
      });
      riskScore += 40;
    }

    if (indicators.length > 0) {
      await this._flagUser(userId, FRAUD_TYPE.VPN_PROXY_USAGE, riskScore, indicators);
      return {
        fraud: true,
        type: FRAUD_TYPE.VPN_PROXY_USAGE,
        riskScore,
        indicators
      };
    }

    return { fraud: false, riskScore: 0 };
  }

  /**
   * Get IP information (stub - use commercial service in production)
   */
  async _getIPInfo(ip) {
    // In production: Call IPQualityScore, MaxMind, etc.
    // Example: https://www.ipqualityscore.com/documentation/proxy-detection/overview

    // For now, return mock data
    return {
      vpn: false,
      proxy: false,
      tor: false,
      hosting: false,
      datacenter: false,
      country: 'AU',
      city: 'Sydney',
      riskScore: 0
    };
  }

  /**
   * Check for fake guardian
   */
  async checkFakeGuardian(guardianId, userId, responseTime, interaction) {
    const indicators = [];
    let riskScore = 0;

    // Track guardian relationships
    if (!this.guardianRelationships.has(guardianId)) {
      this.guardianRelationships.set(guardianId, []);
    }

    const relationships = this.guardianRelationships.get(guardianId);
    relationships.push({
      userId,
      createdAt: Date.now(),
      interactions: [interaction]
    });

    // Check if guardian manages too many users
    const uniqueUsers = new Set(relationships.map(r => r.userId));
    if (uniqueUsers.size > 5) {
      indicators.push({
        reason: 'Guardian manages too many users',
        userCount: uniqueUsers.size
      });
      riskScore += 40;
    }

    // Check response time (fake guardians respond instantly)
    if (responseTime && responseTime < THRESHOLDS.GUARDIAN_RESPONSE_TIME_MIN) {
      indicators.push({
        reason: 'Suspiciously fast guardian response',
        responseTime: `${responseTime}s`
      });
      riskScore += 35;
    }

    // Check if guardian and user have same device/IP
    const guardianUser = await this._getUserInfo(guardianId);
    const user = await this._getUserInfo(userId);

    if (guardianUser && user) {
      if (guardianUser.lastIP === user.lastIP) {
        indicators.push({
          reason: 'Guardian and user share same IP',
          ip: user.lastIP
        });
        riskScore += 50;
      }

      if (guardianUser.lastDevice === user.lastDevice) {
        indicators.push({
          reason: 'Guardian and user share same device',
          deviceId: user.lastDevice
        });
        riskScore += 60;
      }
    }

    // Check interaction patterns
    const relationship = relationships.find(r => r.userId === userId);
    if (relationship && relationship.interactions.length > 0) {
      const avgResponseTime = relationship.interactions.reduce((sum, i) =>
        sum + (i.responseTime || 0), 0
      ) / relationship.interactions.length;

      if (avgResponseTime < THRESHOLDS.GUARDIAN_RESPONSE_TIME_MIN) {
        indicators.push({
          reason: 'Consistently fast guardian responses',
          avgResponseTime: `${avgResponseTime.toFixed(1)}s`
        });
        riskScore += 25;
      }
    }

    if (indicators.length > 0) {
      await this._flagUser(userId, FRAUD_TYPE.FAKE_GUARDIAN, riskScore, indicators);
      return {
        fraud: true,
        type: FRAUD_TYPE.FAKE_GUARDIAN,
        riskScore,
        indicators
      };
    }

    return { fraud: false, riskScore: 0 };
  }

  /**
   * Check payment request fraud
   */
  async checkPaymentFraud(userId, amount, frequency) {
    const indicators = [];
    let riskScore = 0;

    // Track payment requests
    if (!this.paymentRequests.has(userId)) {
      this.paymentRequests.set(userId, []);
    }

    const requests = this.paymentRequests.get(userId);
    requests.push({ amount, timestamp: Date.now() });

    // Check frequency
    const last24h = requests.filter(r =>
      Date.now() - r.timestamp < 24 * 60 * 60 * 1000
    );

    if (last24h.length > THRESHOLDS.PAYMENT_FREQUENCY_LIMIT) {
      indicators.push({
        reason: 'Too many payment requests in 24 hours',
        count: last24h.length
      });
      riskScore += 40;
    }

    // Check for unusual amounts
    const avgAmount = requests.reduce((sum, r) => sum + r.amount, 0) / requests.length;
    const stdDev = Math.sqrt(
      requests.reduce((sum, r) => sum + Math.pow(r.amount - avgAmount, 2), 0) / requests.length
    );

    if (Math.abs(amount - avgAmount) > 3 * stdDev) {
      indicators.push({
        reason: 'Unusual payment amount',
        amount,
        avgAmount: avgAmount.toFixed(2),
        stdDev: stdDev.toFixed(2)
      });
      riskScore += 30;
    }

    // Check for velocity abuse (rapid succession)
    if (requests.length > 1) {
      const lastRequest = requests[requests.length - 2];
      const timeDiff = Date.now() - lastRequest.timestamp;

      if (timeDiff < 60 * 1000) { // Less than 1 minute
        indicators.push({
          reason: 'Payment requests in rapid succession',
          timeDiff: `${Math.floor(timeDiff / 1000)}s`
        });
        riskScore += 35;
      }
    }

    if (indicators.length > 0) {
      await this._flagUser(userId, FRAUD_TYPE.PAYMENT_FRAUD, riskScore, indicators);
      return {
        fraud: true,
        type: FRAUD_TYPE.PAYMENT_FRAUD,
        riskScore,
        indicators
      };
    }

    return { fraud: false, riskScore: 0 };
  }

  /**
   * Check for bot activity
   */
  async checkBotActivity(userId, userAgent, mouseMovements, keystrokes) {
    const indicators = [];
    let riskScore = 0;

    // Check user agent
    if (!userAgent || userAgent.includes('bot') || userAgent.includes('crawler')) {
      indicators.push({
        reason: 'Bot-like user agent',
        userAgent
      });
      riskScore += 50;
    }

    // Check mouse movements (bots have perfect linear movements)
    if (mouseMovements && mouseMovements.length > 10) {
      const isLinear = this._checkLinearMovement(mouseMovements);
      if (isLinear) {
        indicators.push({
          reason: 'Perfect linear mouse movements detected'
        });
        riskScore += 45;
      }
    }

    // Check keystroke patterns (bots have consistent timing)
    if (keystrokes && keystrokes.length > 20) {
      const variance = this._calculateKeystrokeVariance(keystrokes);
      if (variance < 10) { // Very low variance indicates bot
        indicators.push({
          reason: 'Consistent keystroke timing (bot-like)',
          variance
        });
        riskScore += 40;
      }
    }

    if (indicators.length > 0) {
      await this._flagUser(userId, FRAUD_TYPE.BOT_ACTIVITY, riskScore, indicators);
      return {
        fraud: true,
        type: FRAUD_TYPE.BOT_ACTIVITY,
        riskScore,
        indicators
      };
    }

    return { fraud: false, riskScore: 0 };
  }

  /**
   * Calculate similarity between two fingerprints
   */
  _calculateSimilarity(fp1, fp2) {
    if (!fp1 || !fp2) return 0;

    const keys = new Set([...Object.keys(fp1), ...Object.keys(fp2)]);
    let matches = 0;

    for (const key of keys) {
      if (fp1[key] === fp2[key]) {
        matches++;
      }
    }

    return matches / keys.size;
  }

  /**
   * Calculate behavior similarity
   */
  _calculateBehaviorSimilarity(behavior1, behavior2) {
    // Simplified similarity calculation
    // In production: Use more sophisticated ML-based similarity
    return 0.9; // Stub
  }

  /**
   * Calculate distance between locations
   */
  _calculateDistance(loc1, loc2) {
    if (!loc1 || !loc2) return 0;

    const R = 6371; // Earth radius in km
    const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
    const dLon = (loc2.lon - loc1.lon) * Math.PI / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Check for linear mouse movement
   */
  _checkLinearMovement(movements) {
    // Check if movements are perfectly linear (bot-like)
    if (movements.length < 3) return false;

    let linearCount = 0;
    for (let i = 2; i < movements.length; i++) {
      const dx1 = movements[i - 1].x - movements[i - 2].x;
      const dy1 = movements[i - 1].y - movements[i - 2].y;
      const dx2 = movements[i].x - movements[i - 1].x;
      const dy2 = movements[i].y - movements[i - 1].y;

      const angle1 = Math.atan2(dy1, dx1);
      const angle2 = Math.atan2(dy2, dx2);

      if (Math.abs(angle1 - angle2) < 0.1) {
        linearCount++;
      }
    }

    return linearCount / movements.length > 0.8;
  }

  /**
   * Calculate keystroke variance
   */
  _calculateKeystrokeVariance(keystrokes) {
    if (keystrokes.length < 2) return 100;

    const intervals = [];
    for (let i = 1; i < keystrokes.length; i++) {
      intervals.push(keystrokes[i].timestamp - keystrokes[i - 1].timestamp);
    }

    const avg = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;
    const variance = intervals.reduce((sum, i) => sum + Math.pow(i - avg, 2), 0) / intervals.length;

    return Math.sqrt(variance);
  }

  /**
   * Get user info (stub)
   */
  async _getUserInfo(userId) {
    // In production: Query database
    return {
      userId,
      lastIP: '192.168.1.1',
      lastDevice: 'device_123'
    };
  }

  /**
   * Flag user for fraud
   */
  async _flagUser(userId, fraudType, riskScore, indicators) {
    this.flaggedUsers.set(userId, {
      fraudType,
      riskScore,
      indicators,
      timestamp: Date.now()
    });

    await auditLogger.logSecurityEvent({
      event: 'fraud_detected',
      severity: riskScore > 70 ? 'critical' : riskScore > 50 ? 'high' : 'medium',
      userId,
      fraudType,
      riskScore,
      indicators,
      timestamp: Date.now()
    });

    console.log(`[FraudDetector] User ${userId} flagged for ${fraudType} (score: ${riskScore})`);
  }

  /**
   * Get user fraud status
   */
  getUserFraudStatus(userId) {
    return this.flaggedUsers.get(userId) || { flagged: false, riskScore: 0 };
  }

  /**
   * Clear user flag
   */
  clearUserFlag(userId) {
    this.flaggedUsers.delete(userId);
    console.log(`[FraudDetector] User ${userId} fraud flag cleared`);
  }

  /**
   * Get fraud statistics
   */
  getStatistics() {
    const stats = {
      totalFlagged: this.flaggedUsers.size,
      byType: {},
      byRisk: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      }
    };

    for (const [userId, data] of this.flaggedUsers.entries()) {
      // Count by type
      stats.byType[data.fraudType] = (stats.byType[data.fraudType] || 0) + 1;

      // Count by risk
      if (data.riskScore <= 30) stats.byRisk.low++;
      else if (data.riskScore <= 60) stats.byRisk.medium++;
      else if (data.riskScore <= 85) stats.byRisk.high++;
      else stats.byRisk.critical++;
    }

    return stats;
  }
}

// Export singleton instance
const fraudDetector = new FraudDetector();
module.exports = fraudDetector;

// Export class and constants for testing
module.exports.FraudDetector = FraudDetector;
module.exports.FRAUD_TYPE = FRAUD_TYPE;
module.exports.RISK_SCORE = RISK_SCORE;
module.exports.THRESHOLDS = THRESHOLDS;
