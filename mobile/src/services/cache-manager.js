/**
 * Cache Manager Service
 *
 * Intelligent caching with LRU (Least Recently Used) eviction
 * Manages cache size limit of 100MB
 *
 * Cached Data:
 * - API responses
 * - User profile data
 * - Transaction history
 * - Pattern analysis results
 * - Guardian information
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import localDatabase from './local-database';

// Cache configuration
const CACHE_CONFIG = {
  MAX_SIZE_BYTES: 100 * 1024 * 1024,  // 100MB
  MAX_AGE_MS: 24 * 60 * 60 * 1000,    // 24 hours default
  CLEANUP_INTERVAL_MS: 60 * 60 * 1000 // 1 hour
};

// Cache key prefixes
const CACHE_PREFIX = {
  API_RESPONSE: 'cache_api_',
  USER_PROFILE: 'cache_profile_',
  TRANSACTIONS: 'cache_transactions_',
  PATTERNS: 'cache_patterns_',
  GUARDIAN: 'cache_guardian_',
  ANALYTICS: 'cache_analytics_',
  EMERGENCY: 'cache_emergency_'
};

// Cache priorities (higher = keep longer)
const CACHE_PRIORITY = {
  CRITICAL: 10,     // Emergency contacts, guardian info
  HIGH: 7,          // User profile, recent transactions
  MEDIUM: 5,        // Patterns, analytics
  LOW: 3,           // API responses
  TEMPORARY: 1      // One-time use data
};

class CacheManager {
  constructor() {
    this.currentSize = 0;
    this.cacheKeys = new Set();
    this.cleanupInterval = null;
    this.listeners = [];
  }

  /**
   * Initialize cache manager
   */
  async initialize() {
    await localDatabase.initialize();

    // Calculate current cache size
    await this._calculateCurrentSize();

    // Start cleanup interval
    this._startCleanup();

    // Clean up expired cache
    await this.cleanupExpired();

    console.log('[CacheManager] Initialized successfully');
    console.log('[CacheManager] Current cache size:', this._formatBytes(this.currentSize));
  }

  /**
   * Set cache item
   */
  async set(key, value, options = {}) {
    const {
      ttl = CACHE_CONFIG.MAX_AGE_MS,
      priority = CACHE_PRIORITY.LOW
    } = options;

    try {
      // Serialize value
      const serialized = JSON.stringify(value);
      const sizeBytes = new Blob([serialized]).size;

      // Check if we need to make space
      const requiredSpace = this.currentSize + sizeBytes - this._getItemSize(key);

      if (requiredSpace > CACHE_CONFIG.MAX_SIZE_BYTES) {
        await this._makeSpace(sizeBytes);
      }

      // Calculate expiry time
      const expiresAt = ttl ? Math.floor((Date.now() + ttl) / 1000) : null;

      // Store in AsyncStorage
      await AsyncStorage.setItem(key, serialized);

      // Store metadata in database
      await localDatabase.setCacheMetadata(key, sizeBytes, expiresAt);

      // Update cache tracking
      this.cacheKeys.add(key);
      this.currentSize = await this._calculateCurrentSize();

      console.log('[CacheManager] Cached:', {
        key: this._truncateKey(key),
        size: this._formatBytes(sizeBytes),
        ttl: ttl ? `${Math.floor(ttl / 1000)}s` : 'never',
        priority
      });

      this._notifyListeners({
        type: 'set',
        key,
        size: sizeBytes
      });

      return true;
    } catch (error) {
      console.error('[CacheManager] Set error:', error);
      return false;
    }
  }

  /**
   * Get cache item
   */
  async get(key, defaultValue = null) {
    try {
      // Check if expired
      const metadata = await localDatabase.getCacheMetadata(key);

      if (!metadata) {
        return defaultValue;
      }

      if (metadata.expiresAt && metadata.expiresAt < Date.now()) {
        console.log('[CacheManager] Cache expired:', this._truncateKey(key));
        await this.remove(key);
        return defaultValue;
      }

      // Get from AsyncStorage
      const serialized = await AsyncStorage.getItem(key);

      if (!serialized) {
        return defaultValue;
      }

      // Update access time
      await localDatabase.updateCacheAccess(key);

      console.log('[CacheManager] Cache hit:', this._truncateKey(key));

      this._notifyListeners({
        type: 'get',
        key,
        hit: true
      });

      return JSON.parse(serialized);
    } catch (error) {
      console.error('[CacheManager] Get error:', error);
      this._notifyListeners({
        type: 'get',
        key,
        hit: false
      });
      return defaultValue;
    }
  }

  /**
   * Remove cache item
   */
  async remove(key) {
    try {
      await AsyncStorage.removeItem(key);
      await localDatabase.removeCacheMetadata(key);

      this.cacheKeys.delete(key);
      this.currentSize = await this._calculateCurrentSize();

      console.log('[CacheManager] Removed:', this._truncateKey(key));

      this._notifyListeners({
        type: 'remove',
        key
      });

      return true;
    } catch (error) {
      console.error('[CacheManager] Remove error:', error);
      return false;
    }
  }

  /**
   * Check if key exists in cache
   */
  async has(key) {
    const metadata = await localDatabase.getCacheMetadata(key);

    if (!metadata) {
      return false;
    }

    // Check if expired
    if (metadata.expiresAt && metadata.expiresAt < Date.now()) {
      await this.remove(key);
      return false;
    }

    return true;
  }

  /**
   * Get item size
   */
  _getItemSize(key) {
    const metadata = localDatabase.getCacheMetadata(key);
    return metadata?.sizeBytes || 0;
  }

  /**
   * Make space for new item
   */
  async _makeSpace(requiredBytes) {
    console.log('[CacheManager] Making space for:', this._formatBytes(requiredBytes));

    let freedSpace = 0;
    const targetSpace = requiredBytes + (CACHE_CONFIG.MAX_SIZE_BYTES * 0.1); // Add 10% buffer

    // Get LRU items
    const lruItems = await localDatabase.getLRUCacheItems(100);

    for (const item of lruItems) {
      if (this.currentSize - freedSpace <= CACHE_CONFIG.MAX_SIZE_BYTES - targetSpace) {
        break;
      }

      // Skip critical items
      if (item.key.startsWith(CACHE_PREFIX.EMERGENCY) ||
          item.key.startsWith(CACHE_PREFIX.GUARDIAN)) {
        continue;
      }

      await this.remove(item.key);
      freedSpace += item.sizeBytes;
    }

    console.log('[CacheManager] Freed space:', this._formatBytes(freedSpace));

    this._notifyListeners({
      type: 'eviction',
      freedSpace
    });
  }

  /**
   * Calculate current cache size
   */
  async _calculateCurrentSize() {
    this.currentSize = await localDatabase.getTotalCacheSize();
    return this.currentSize;
  }

  /**
   * Clean up expired cache
   */
  async cleanupExpired() {
    console.log('[CacheManager] Cleaning up expired cache');

    const now = Math.floor(Date.now() / 1000);
    let cleaned = 0;

    // Get all cache keys
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter(key =>
      Object.values(CACHE_PREFIX).some(prefix => key.startsWith(prefix))
    );

    for (const key of cacheKeys) {
      const metadata = await localDatabase.getCacheMetadata(key);

      if (metadata && metadata.expiresAt && metadata.expiresAt < now) {
        await this.remove(key);
        cleaned++;
      }
    }

    console.log('[CacheManager] Cleaned up expired items:', cleaned);
  }

  /**
   * Start cleanup interval
   */
  _startCleanup() {
    if (this.cleanupInterval) {
      return;
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired().catch(error => {
        console.error('[CacheManager] Cleanup error:', error);
      });
    }, CACHE_CONFIG.CLEANUP_INTERVAL_MS);

    console.log('[CacheManager] Started cleanup interval');
  }

  /**
   * Stop cleanup interval
   */
  _stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('[CacheManager] Stopped cleanup interval');
    }
  }

  // ==================== SPECIALIZED CACHE METHODS ====================

  /**
   * Cache API response
   */
  async cacheAPIResponse(endpoint, params, response, ttl = 5 * 60 * 1000) {
    const key = `${CACHE_PREFIX.API_RESPONSE}${endpoint}_${JSON.stringify(params)}`;
    return await this.set(key, response, {
      ttl,
      priority: CACHE_PRIORITY.LOW
    });
  }

  /**
   * Get cached API response
   */
  async getCachedAPIResponse(endpoint, params) {
    const key = `${CACHE_PREFIX.API_RESPONSE}${endpoint}_${JSON.stringify(params)}`;
    return await this.get(key);
  }

  /**
   * Cache user profile
   */
  async cacheUserProfile(userId, profile) {
    const key = `${CACHE_PREFIX.USER_PROFILE}${userId}`;
    return await this.set(key, profile, {
      ttl: CACHE_CONFIG.MAX_AGE_MS,
      priority: CACHE_PRIORITY.HIGH
    });
  }

  /**
   * Get cached user profile
   */
  async getCachedUserProfile(userId) {
    const key = `${CACHE_PREFIX.USER_PROFILE}${userId}`;
    return await this.get(key);
  }

  /**
   * Cache transactions
   */
  async cacheTransactions(userId, transactions) {
    const key = `${CACHE_PREFIX.TRANSACTIONS}${userId}`;
    return await this.set(key, transactions, {
      ttl: 30 * 60 * 1000, // 30 minutes
      priority: CACHE_PRIORITY.HIGH
    });
  }

  /**
   * Get cached transactions
   */
  async getCachedTransactions(userId) {
    const key = `${CACHE_PREFIX.TRANSACTIONS}${userId}`;
    return await this.get(key);
  }

  /**
   * Cache patterns
   */
  async cachePatterns(userId, patterns) {
    const key = `${CACHE_PREFIX.PATTERNS}${userId}`;
    return await this.set(key, patterns, {
      ttl: 60 * 60 * 1000, // 1 hour
      priority: CACHE_PRIORITY.MEDIUM
    });
  }

  /**
   * Get cached patterns
   */
  async getCachedPatterns(userId) {
    const key = `${CACHE_PREFIX.PATTERNS}${userId}`;
    return await this.get(key);
  }

  /**
   * Cache guardian info
   */
  async cacheGuardianInfo(userId, guardian) {
    const key = `${CACHE_PREFIX.GUARDIAN}${userId}`;
    return await this.set(key, guardian, {
      ttl: CACHE_CONFIG.MAX_AGE_MS,
      priority: CACHE_PRIORITY.CRITICAL
    });
  }

  /**
   * Get cached guardian info
   */
  async getCachedGuardianInfo(userId) {
    const key = `${CACHE_PREFIX.GUARDIAN}${userId}`;
    return await this.get(key);
  }

  /**
   * Cache emergency contacts
   */
  async cacheEmergencyContacts(userId, contacts) {
    const key = `${CACHE_PREFIX.EMERGENCY}${userId}`;
    return await this.set(key, contacts, {
      ttl: null, // Never expire
      priority: CACHE_PRIORITY.CRITICAL
    });
  }

  /**
   * Get cached emergency contacts
   */
  async getCachedEmergencyContacts(userId) {
    const key = `${CACHE_PREFIX.EMERGENCY}${userId}`;
    return await this.get(key);
  }

  /**
   * Cache analytics data
   */
  async cacheAnalytics(userId, analytics) {
    const key = `${CACHE_PREFIX.ANALYTICS}${userId}`;
    return await this.set(key, analytics, {
      ttl: 60 * 60 * 1000, // 1 hour
      priority: CACHE_PRIORITY.MEDIUM
    });
  }

  /**
   * Get cached analytics
   */
  async getCachedAnalytics(userId) {
    const key = `${CACHE_PREFIX.ANALYTICS}${userId}`;
    return await this.get(key);
  }

  // ==================== CACHE STATISTICS ====================

  /**
   * Get cache statistics
   */
  async getStatistics() {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter(key =>
      Object.values(CACHE_PREFIX).some(prefix => key.startsWith(prefix))
    );

    const stats = {
      totalSize: this.currentSize,
      maxSize: CACHE_CONFIG.MAX_SIZE_BYTES,
      utilizationPercent: (this.currentSize / CACHE_CONFIG.MAX_SIZE_BYTES) * 100,
      itemCount: cacheKeys.length,
      byPrefix: {}
    };

    // Count by prefix
    for (const prefix of Object.values(CACHE_PREFIX)) {
      const prefixKeys = cacheKeys.filter(key => key.startsWith(prefix));
      stats.byPrefix[prefix] = prefixKeys.length;
    }

    return stats;
  }

  /**
   * Get cache efficiency metrics
   */
  async getEfficiencyMetrics() {
    // Get access counts from database
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter(key =>
      Object.values(CACHE_PREFIX).some(prefix => key.startsWith(prefix))
    );

    let totalAccesses = 0;
    let itemsWithAccesses = 0;

    for (const key of cacheKeys) {
      const metadata = await localDatabase.getCacheMetadata(key);
      if (metadata && metadata.accessCount > 0) {
        totalAccesses += metadata.accessCount;
        itemsWithAccesses++;
      }
    }

    return {
      totalAccesses,
      itemsWithAccesses,
      averageAccessesPerItem: itemsWithAccesses > 0
        ? totalAccesses / itemsWithAccesses
        : 0
    };
  }

  // ==================== CACHE MANAGEMENT ====================

  /**
   * Clear all cache
   */
  async clearAll() {
    console.log('[CacheManager] Clearing all cache');

    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter(key =>
      Object.values(CACHE_PREFIX).some(prefix => key.startsWith(prefix))
    );

    for (const key of cacheKeys) {
      await this.remove(key);
    }

    this.cacheKeys.clear();
    this.currentSize = 0;

    console.log('[CacheManager] All cache cleared');

    this._notifyListeners({
      type: 'clear_all'
    });
  }

  /**
   * Clear cache by prefix
   */
  async clearByPrefix(prefix) {
    console.log('[CacheManager] Clearing cache by prefix:', prefix);

    const allKeys = await AsyncStorage.getAllKeys();
    const prefixKeys = allKeys.filter(key => key.startsWith(prefix));

    for (const key of prefixKeys) {
      await this.remove(key);
    }

    console.log('[CacheManager] Cleared items:', prefixKeys.length);

    this._notifyListeners({
      type: 'clear_prefix',
      prefix,
      count: prefixKeys.length
    });
  }

  /**
   * Prune cache to target size
   */
  async pruneToSize(targetSizeBytes) {
    if (this.currentSize <= targetSizeBytes) {
      return;
    }

    const bytesToFree = this.currentSize - targetSizeBytes;
    await this._makeSpace(bytesToFree);

    console.log('[CacheManager] Pruned cache to target size:', this._formatBytes(targetSizeBytes));
  }

  /**
   * Optimize cache
   */
  async optimize() {
    console.log('[CacheManager] Optimizing cache');

    // Clean up expired
    await this.cleanupExpired();

    // Remove items that haven't been accessed in a while
    const oldThreshold = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
    const lruItems = await localDatabase.getLRUCacheItems(1000);

    let removed = 0;
    for (const item of lruItems) {
      if (item.lastAccessed < oldThreshold) {
        // Skip critical items
        if (item.key.startsWith(CACHE_PREFIX.EMERGENCY) ||
            item.key.startsWith(CACHE_PREFIX.GUARDIAN)) {
          continue;
        }

        await this.remove(item.key);
        removed++;
      }
    }

    console.log('[CacheManager] Optimization complete. Removed:', removed);

    this._notifyListeners({
      type: 'optimize',
      removed
    });
  }

  // ==================== UTILITIES ====================

  /**
   * Format bytes for display
   */
  _formatBytes(bytes) {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  /**
   * Truncate key for logging
   */
  _truncateKey(key, maxLength = 50) {
    if (key.length <= maxLength) return key;
    return `${key.substring(0, maxLength)}...`;
  }

  /**
   * Subscribe to cache events
   */
  subscribe(listener) {
    this.listeners.push(listener);

    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify listeners
   */
  _notifyListeners(event) {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('[CacheManager] Listener error:', error);
      }
    }
  }

  /**
   * Shutdown cache manager
   */
  shutdown() {
    this._stopCleanup();
    console.log('[CacheManager] Shutdown complete');
  }
}

// Export singleton instance
const cacheManager = new CacheManager();
export default cacheManager;

// Export class and constants for testing
export { CacheManager, CACHE_CONFIG, CACHE_PREFIX, CACHE_PRIORITY };
