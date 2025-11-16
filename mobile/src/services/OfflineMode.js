/**
 * Offline Mode Service
 * Handles offline scenarios with caching and queueing
 *
 * OFFLINE BEHAVIOR:
 * - Cache last 7 days of transactions
 * - Show offline banner
 * - Queue payment requests for sync
 * - Disable AI conversations (require connection)
 * - Store conversation attempts for later
 */

import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEYS = {
  TRANSACTIONS: 'offline_transactions',
  CLEAN_STREAK: 'offline_clean_streak',
  VAULT_BALANCE: 'offline_vault_balance',
  ALLOWANCE_BALANCE: 'offline_allowance_balance',
  PENDING_REQUESTS: 'offline_pending_requests',
  LAST_SYNC: 'offline_last_sync',
};

const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

class OfflineModeService {
  constructor() {
    this.isOnline = true;
    this.listeners = [];
    this.netInfoSubscription = null;
  }

  /**
   * Initialize offline mode
   * Sets up network listener
   */
  async initialize() {
    try {
      // Get initial connection state
      const netInfo = await NetInfo.fetch();
      this.isOnline = netInfo.isConnected && netInfo.isInternetReachable;

      // Listen for connection changes
      this.netInfoSubscription = NetInfo.addEventListener(state => {
        const wasOnline = this.isOnline;
        this.isOnline = state.isConnected && state.isInternetReachable;

        // Connection state changed
        if (wasOnline !== this.isOnline) {
          console.log(`Connection status changed: ${this.isOnline ? 'ONLINE' : 'OFFLINE'}`);
          this._notifyListeners({ online: this.isOnline });

          // If back online, sync pending requests
          if (this.isOnline) {
            this.syncPendingRequests();
          }
        }
      });

      return this.isOnline;
    } catch (error) {
      console.error('OfflineMode initialization error:', error);
      return false;
    }
  }

  /**
   * Check if currently online
   */
  getIsOnline() {
    return this.isOnline;
  }

  /**
   * Cache transactions for offline access
   */
  async cacheTransactions(transactions) {
    try {
      const cacheData = {
        data: transactions,
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(CACHE_KEYS.TRANSACTIONS, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error caching transactions:', error);
    }
  }

  /**
   * Get cached transactions
   */
  async getCachedTransactions() {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEYS.TRANSACTIONS);

      if (!cached) {
        return null;
      }

      const { data, timestamp } = JSON.parse(cached);

      // Check if cache expired
      if (Date.now() - timestamp > CACHE_EXPIRY) {
        await AsyncStorage.removeItem(CACHE_KEYS.TRANSACTIONS);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting cached transactions:', error);
      return null;
    }
  }

  /**
   * Cache clean streak
   */
  async cacheCleanStreak(days) {
    try {
      const cacheData = {
        days,
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(CACHE_KEYS.CLEAN_STREAK, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error caching clean streak:', error);
    }
  }

  /**
   * Get cached clean streak
   */
  async getCachedCleanStreak() {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEYS.CLEAN_STREAK);

      if (!cached) {
        return null;
      }

      const { days, timestamp } = JSON.parse(cached);

      // Check if cache expired
      if (Date.now() - timestamp > CACHE_EXPIRY) {
        await AsyncStorage.removeItem(CACHE_KEYS.CLEAN_STREAK);
        return null;
      }

      return days;
    } catch (error) {
      console.error('Error getting cached clean streak:', error);
      return null;
    }
  }

  /**
   * Cache vault balance
   */
  async cacheVaultBalance(balance) {
    try {
      const cacheData = {
        balance,
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(CACHE_KEYS.VAULT_BALANCE, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error caching vault balance:', error);
    }
  }

  /**
   * Get cached vault balance
   */
  async getCachedVaultBalance() {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEYS.VAULT_BALANCE);

      if (!cached) {
        return null;
      }

      const { balance, timestamp } = JSON.parse(cached);

      // Check if cache expired
      if (Date.now() - timestamp > CACHE_EXPIRY) {
        await AsyncStorage.removeItem(CACHE_KEYS.VAULT_BALANCE);
        return null;
      }

      return balance;
    } catch (error) {
      console.error('Error getting cached vault balance:', error);
      return null;
    }
  }

  /**
   * Cache allowance balance
   */
  async cacheAllowanceBalance(balance) {
    try {
      const cacheData = {
        balance,
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(CACHE_KEYS.ALLOWANCE_BALANCE, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error caching allowance balance:', error);
    }
  }

  /**
   * Get cached allowance balance
   */
  async getCachedAllowanceBalance() {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEYS.ALLOWANCE_BALANCE);

      if (!cached) {
        return null;
      }

      const { balance, timestamp } = JSON.parse(cached);

      // Cache allowance for max 1 day (it resets daily)
      if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
        await AsyncStorage.removeItem(CACHE_KEYS.ALLOWANCE_BALANCE);
        return null;
      }

      return balance;
    } catch (error) {
      console.error('Error getting cached allowance balance:', error);
      return null;
    }
  }

  /**
   * Queue payment request for sync when back online
   */
  async queuePaymentRequest(amount, reason, isVoice) {
    try {
      const pending = await this.getPendingRequests();

      const request = {
        id: Date.now().toString(),
        amount,
        reason,
        is_voice: isVoice,
        queued_at: new Date().toISOString(),
      };

      pending.push(request);

      await AsyncStorage.setItem(CACHE_KEYS.PENDING_REQUESTS, JSON.stringify(pending));

      return request.id;
    } catch (error) {
      console.error('Error queueing payment request:', error);
      return null;
    }
  }

  /**
   * Get pending requests
   */
  async getPendingRequests() {
    try {
      const pending = await AsyncStorage.getItem(CACHE_KEYS.PENDING_REQUESTS);
      return pending ? JSON.parse(pending) : [];
    } catch (error) {
      console.error('Error getting pending requests:', error);
      return [];
    }
  }

  /**
   * Sync pending requests when back online
   */
  async syncPendingRequests() {
    try {
      const pending = await this.getPendingRequests();

      if (pending.length === 0) {
        return { success: true, count: 0 };
      }

      console.log(`Syncing ${pending.length} pending requests...`);

      // TODO: Send each pending request to API
      // const results = await Promise.all(pending.map(req => this.submitPaymentRequest(req)));

      // Clear pending requests after sync
      await AsyncStorage.removeItem(CACHE_KEYS.PENDING_REQUESTS);

      // Update last sync time
      await AsyncStorage.setItem(CACHE_KEYS.LAST_SYNC, Date.now().toString());

      return { success: true, count: pending.length };
    } catch (error) {
      console.error('Error syncing pending requests:', error);
      return { success: false, error };
    }
  }

  /**
   * Get last sync timestamp
   */
  async getLastSync() {
    try {
      const timestamp = await AsyncStorage.getItem(CACHE_KEYS.LAST_SYNC);
      return timestamp ? parseInt(timestamp, 10) : null;
    } catch (error) {
      console.error('Error getting last sync:', error);
      return null;
    }
  }

  /**
   * Check if AI conversation is available (requires online)
   */
  canUseAIConversation() {
    return this.isOnline;
  }

  /**
   * Record failed AI conversation attempt for later notification
   */
  async recordFailedConversationAttempt(conversationId) {
    try {
      const attempts = await AsyncStorage.getItem('failed_conversation_attempts');
      const list = attempts ? JSON.parse(attempts) : [];

      list.push({
        conversation_id: conversationId,
        attempted_at: new Date().toISOString(),
      });

      await AsyncStorage.setItem('failed_conversation_attempts', JSON.stringify(list));
    } catch (error) {
      console.error('Error recording failed conversation attempt:', error);
    }
  }

  /**
   * Register listener for connection state changes
   */
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify all listeners of connection state change
   */
  _notifyListeners(state) {
    this.listeners.forEach(callback => callback(state));
  }

  /**
   * Clear all cached data
   */
  async clearCache() {
    try {
      const keys = Object.values(CACHE_KEYS);
      await Promise.all(keys.map(key => AsyncStorage.removeItem(key)));
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Clean up
   */
  destroy() {
    if (this.netInfoSubscription) {
      this.netInfoSubscription();
    }
  }
}

// Singleton instance
const OfflineMode = new OfflineModeService();

export default OfflineMode;
