/**
 * Offline Sync Service
 *
 * Orchestrates offline-first functionality
 * Coordinates: Local Database, Queue Manager, Conflict Resolver, Cache Manager
 *
 * Features:
 * - Background sync when online
 * - Incremental sync with conflict resolution
 * - Priority sync for critical data
 * - Automatic retry with exponential backoff
 */

import NetInfo from '@react-native-community/netinfo';
import localDatabase from './local-database';
import queueManager from './queue-manager';
import conflictResolver from './conflict-resolver';
import cacheManager from './cache-manager';
import { v4 as uuidv4 } from 'uuid';

// Sync configuration
const SYNC_CONFIG = {
  FULL_SYNC_INTERVAL_MS: 60 * 60 * 1000,    // 1 hour
  INCREMENTAL_SYNC_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
  BACKGROUND_SYNC_DELAY_MS: 10 * 1000,       // 10 seconds after coming online
  MAX_SYNC_BATCH_SIZE: 50,
  RETRY_DELAYS: [2000, 4000, 8000, 16000]    // Exponential backoff (2s, 4s, 8s, 16s)
};

// Sync status
const SYNC_STATUS = {
  IDLE: 'idle',
  SYNCING: 'syncing',
  SUCCESS: 'success',
  ERROR: 'error',
  OFFLINE: 'offline'
};

class OfflineSync {
  constructor() {
    this.isOnline = true;
    this.syncStatus = SYNC_STATUS.IDLE;
    this.lastSyncTime = null;
    this.fullSyncInterval = null;
    this.incrementalSyncInterval = null;
    this.listeners = [];
    this.currentSyncOperation = null;
  }

  /**
   * Initialize offline sync
   */
  async initialize() {
    console.log('[OfflineSync] Initializing...');

    // Initialize all services
    await localDatabase.initialize();
    await queueManager.initialize();
    await cacheManager.initialize();

    // Monitor network state
    this.unsubscribeNetInfo = NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected && state.isInternetReachable;

      console.log('[OfflineSync] Network state changed:', {
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        isOnline: this.isOnline
      });

      if (!wasOnline && this.isOnline) {
        // Just came online - start syncing after a delay
        console.log('[OfflineSync] Back online - scheduling sync');
        setTimeout(() => {
          this.triggerSync('full');
        }, SYNC_CONFIG.BACKGROUND_SYNC_DELAY_MS);
      } else if (wasOnline && !this.isOnline) {
        // Just went offline
        console.log('[OfflineSync] Went offline');
        this._updateStatus(SYNC_STATUS.OFFLINE);
      }

      this._notifyListeners({
        type: 'network_change',
        isOnline: this.isOnline
      });
    });

    // Start sync intervals if online
    if (this.isOnline) {
      this._startSyncIntervals();
    } else {
      this._updateStatus(SYNC_STATUS.OFFLINE);
    }

    // Get last sync time from storage
    this.lastSyncTime = await localDatabase.getSetting('lastSyncTime', null);

    console.log('[OfflineSync] Initialized successfully');
    console.log('[OfflineSync] Last sync:', this.lastSyncTime
      ? new Date(this.lastSyncTime).toLocaleString()
      : 'Never');
  }

  /**
   * Start sync intervals
   */
  _startSyncIntervals() {
    // Full sync every hour
    this.fullSyncInterval = setInterval(() => {
      if (this.isOnline) {
        this.triggerSync('full');
      }
    }, SYNC_CONFIG.FULL_SYNC_INTERVAL_MS);

    // Incremental sync every 5 minutes
    this.incrementalSyncInterval = setInterval(() => {
      if (this.isOnline) {
        this.triggerSync('incremental');
      }
    }, SYNC_CONFIG.INCREMENTAL_SYNC_INTERVAL_MS);

    console.log('[OfflineSync] Started sync intervals');
  }

  /**
   * Stop sync intervals
   */
  _stopSyncIntervals() {
    if (this.fullSyncInterval) {
      clearInterval(this.fullSyncInterval);
      this.fullSyncInterval = null;
    }

    if (this.incrementalSyncInterval) {
      clearInterval(this.incrementalSyncInterval);
      this.incrementalSyncInterval = null;
    }

    console.log('[OfflineSync] Stopped sync intervals');
  }

  /**
   * Trigger sync
   */
  async triggerSync(type = 'incremental') {
    if (!this.isOnline) {
      console.log('[OfflineSync] Cannot sync - offline');
      return { success: false, reason: 'offline' };
    }

    if (this.syncStatus === SYNC_STATUS.SYNCING) {
      console.log('[OfflineSync] Sync already in progress');
      return { success: false, reason: 'already_syncing' };
    }

    console.log(`[OfflineSync] Starting ${type} sync`);
    this._updateStatus(SYNC_STATUS.SYNCING);

    const syncId = uuidv4();
    const startTime = Date.now();

    try {
      let result;

      if (type === 'full') {
        result = await this._performFullSync(syncId);
      } else {
        result = await this._performIncrementalSync(syncId);
      }

      const duration = Date.now() - startTime;

      if (result.success) {
        this.lastSyncTime = Date.now();
        await localDatabase.setSetting('lastSyncTime', this.lastSyncTime);

        this._updateStatus(SYNC_STATUS.SUCCESS);
        console.log(`[OfflineSync] ${type} sync completed in ${duration}ms`);

        this._notifyListeners({
          type: 'sync_complete',
          syncType: type,
          syncId,
          duration,
          stats: result.stats
        });

        return { success: true, stats: result.stats };
      } else {
        throw new Error(result.error || 'Sync failed');
      }
    } catch (error) {
      console.error('[OfflineSync] Sync failed:', error);
      this._updateStatus(SYNC_STATUS.ERROR);

      this._notifyListeners({
        type: 'sync_error',
        syncType: type,
        syncId,
        error: error.message
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Perform full sync
   */
  async _performFullSync(syncId) {
    console.log('[OfflineSync] Performing full sync');

    const stats = {
      downloaded: 0,
      uploaded: 0,
      conflicts: 0,
      errors: 0
    };

    try {
      // 1. Process sync queue (upload local changes)
      console.log('[OfflineSync] Processing sync queue...');
      await queueManager.processQueue();

      // 2. Download all data from server
      console.log('[OfflineSync] Downloading from server...');

      // Download transactions
      const transactions = await this._downloadTransactions();
      for (const transaction of transactions) {
        await this._syncTransaction(transaction, stats);
      }

      // Download conversations
      const conversations = await this._downloadConversations();
      for (const conversation of conversations) {
        await this._syncConversation(conversation, stats);
      }

      // Download patterns
      const patterns = await this._downloadPatterns();
      for (const pattern of patterns) {
        await this._syncPattern(pattern, stats);
      }

      // Download guardian messages
      const guardianMessages = await this._downloadGuardianMessages();
      for (const message of guardianMessages) {
        await this._syncGuardianMessage(message, stats);
      }

      // Download settings
      const settings = await this._downloadSettings();
      for (const [key, value] of Object.entries(settings)) {
        await this._syncSetting(key, value, stats);
      }

      // 3. Upload unsynced local data
      console.log('[OfflineSync] Uploading unsynced data...');

      await this._uploadUnsyncedTransactions(stats);
      await this._uploadUnsyncedConversations(stats);
      await this._uploadUnsyncedPatterns(stats);
      await this._uploadUnsyncedGuardianMessages(stats);
      await this._uploadUnsyncedSettings(stats);

      console.log('[OfflineSync] Full sync stats:', stats);

      return { success: true, stats };
    } catch (error) {
      console.error('[OfflineSync] Full sync error:', error);
      return { success: false, error: error.message, stats };
    }
  }

  /**
   * Perform incremental sync
   */
  async _performIncrementalSync(syncId) {
    console.log('[OfflineSync] Performing incremental sync');

    const stats = {
      downloaded: 0,
      uploaded: 0,
      conflicts: 0,
      errors: 0
    };

    try {
      // Only sync data modified since last sync
      const since = this.lastSyncTime || 0;

      // Process sync queue
      await queueManager.processQueue();

      // Download recent changes
      const recentTransactions = await this._downloadTransactionsSince(since);
      for (const transaction of recentTransactions) {
        await this._syncTransaction(transaction, stats);
      }

      const recentConversations = await this._downloadConversationsSince(since);
      for (const conversation of recentConversations) {
        await this._syncConversation(conversation, stats);
      }

      // Upload unsynced data (limited batch)
      await this._uploadUnsyncedTransactions(stats, 10);
      await this._uploadUnsyncedConversations(stats, 10);
      await this._uploadUnsyncedPatterns(stats, 10);

      console.log('[OfflineSync] Incremental sync stats:', stats);

      return { success: true, stats };
    } catch (error) {
      console.error('[OfflineSync] Incremental sync error:', error);
      return { success: false, error: error.message, stats };
    }
  }

  // ==================== SYNC OPERATIONS ====================

  /**
   * Sync transaction
   */
  async _syncTransaction(serverTransaction, stats) {
    try {
      const localTransaction = await localDatabase.getTransaction(serverTransaction.id);

      if (localTransaction && !localTransaction.synced) {
        // Conflict - local has unsynced changes
        const resolution = await conflictResolver.resolveTransactionConflict(
          localTransaction,
          serverTransaction
        );

        stats.conflicts++;

        if (resolution.action === 'update_local') {
          await localDatabase.insertTransaction({ ...serverTransaction, synced: true });
          stats.downloaded++;
        }
      } else {
        // No conflict - just insert/update
        await localDatabase.insertTransaction({ ...serverTransaction, synced: true });
        stats.downloaded++;
      }
    } catch (error) {
      console.error('[OfflineSync] Transaction sync error:', error);
      stats.errors++;
    }
  }

  /**
   * Sync conversation
   */
  async _syncConversation(serverConversation, stats) {
    try {
      await localDatabase.insertConversation({ ...serverConversation, synced: true });
      stats.downloaded++;
    } catch (error) {
      console.error('[OfflineSync] Conversation sync error:', error);
      stats.errors++;
    }
  }

  /**
   * Sync pattern
   */
  async _syncPattern(serverPattern, stats) {
    try {
      const localPattern = await localDatabase.getPatterns(serverPattern.userId)
        .then(patterns => patterns.find(p => p.id === serverPattern.id));

      if (localPattern && !localPattern.synced) {
        // Conflict
        const resolution = await conflictResolver.resolvePatternConflict(
          localPattern,
          serverPattern
        );

        stats.conflicts++;

        if (resolution.action === 'merge' || resolution.action === 'update_local') {
          await localDatabase.upsertPattern({ ...resolution.data, synced: true });
          stats.downloaded++;
        }
      } else {
        await localDatabase.upsertPattern({ ...serverPattern, synced: true });
        stats.downloaded++;
      }
    } catch (error) {
      console.error('[OfflineSync] Pattern sync error:', error);
      stats.errors++;
    }
  }

  /**
   * Sync guardian message
   */
  async _syncGuardianMessage(serverMessage, stats) {
    try {
      await localDatabase.insertGuardianMessage({ ...serverMessage, synced: true });
      stats.downloaded++;
    } catch (error) {
      console.error('[OfflineSync] Guardian message sync error:', error);
      stats.errors++;
    }
  }

  /**
   * Sync setting
   */
  async _syncSetting(key, serverValue, stats) {
    try {
      const localValue = await localDatabase.getSetting(key);

      if (localValue !== null) {
        // Conflict
        const resolution = await conflictResolver.resolveSettingConflict(
          key,
          localValue,
          serverValue
        );

        stats.conflicts++;

        if (resolution.action === 'update_local') {
          await localDatabase.setSetting(key, serverValue);
          await localDatabase.markSettingSynced(key);
          stats.downloaded++;
        }
      } else {
        await localDatabase.setSetting(key, serverValue);
        await localDatabase.markSettingSynced(key);
        stats.downloaded++;
      }
    } catch (error) {
      console.error('[OfflineSync] Setting sync error:', error);
      stats.errors++;
    }
  }

  // ==================== UPLOAD OPERATIONS ====================

  /**
   * Upload unsynced transactions
   */
  async _uploadUnsyncedTransactions(stats, limit = 50) {
    const unsynced = await localDatabase.getUnsyncedTransactions(limit);

    for (const transaction of unsynced) {
      try {
        await this._uploadTransaction(transaction);
        await localDatabase.markTransactionSynced(transaction.id);
        stats.uploaded++;
      } catch (error) {
        console.error('[OfflineSync] Transaction upload error:', error);
        stats.errors++;
      }
    }
  }

  /**
   * Upload unsynced conversations
   */
  async _uploadUnsyncedConversations(stats, limit = 50) {
    const unsynced = await localDatabase.getUnsyncedConversations(limit);

    for (const conversation of unsynced) {
      try {
        await this._uploadConversation(conversation);
        await localDatabase.markConversationSynced(conversation.id);
        stats.uploaded++;
      } catch (error) {
        console.error('[OfflineSync] Conversation upload error:', error);
        stats.errors++;
      }
    }
  }

  /**
   * Upload unsynced patterns
   */
  async _uploadUnsyncedPatterns(stats, limit = 50) {
    const unsynced = await localDatabase.getUnsyncedPatterns(limit);

    for (const pattern of unsynced) {
      try {
        await this._uploadPattern(pattern);
        await localDatabase.markPatternSynced(pattern.id);
        stats.uploaded++;
      } catch (error) {
        console.error('[OfflineSync] Pattern upload error:', error);
        stats.errors++;
      }
    }
  }

  /**
   * Upload unsynced guardian messages
   */
  async _uploadUnsyncedGuardianMessages(stats, limit = 50) {
    const unsynced = await localDatabase.getUnsyncedGuardianMessages(limit);

    for (const message of unsynced) {
      try {
        await this._uploadGuardianMessage(message);
        await localDatabase.markGuardianMessageSynced(message.id);
        stats.uploaded++;
      } catch (error) {
        console.error('[OfflineSync] Guardian message upload error:', error);
        stats.errors++;
      }
    }
  }

  /**
   * Upload unsynced settings
   */
  async _uploadUnsyncedSettings(stats) {
    const unsynced = await localDatabase.getUnsyncedSettings();

    for (const [key, value] of Object.entries(unsynced)) {
      try {
        await this._uploadSetting(key, value);
        await localDatabase.markSettingSynced(key);
        stats.uploaded++;
      } catch (error) {
        console.error('[OfflineSync] Setting upload error:', error);
        stats.errors++;
      }
    }
  }

  // ==================== API CALLS (Stub implementations) ====================

  async _downloadTransactions() {
    // TODO: Implement actual API call
    return [];
  }

  async _downloadTransactionsSince(timestamp) {
    // TODO: Implement actual API call
    return [];
  }

  async _downloadConversations() {
    // TODO: Implement actual API call
    return [];
  }

  async _downloadConversationsSince(timestamp) {
    // TODO: Implement actual API call
    return [];
  }

  async _downloadPatterns() {
    // TODO: Implement actual API call
    return [];
  }

  async _downloadGuardianMessages() {
    // TODO: Implement actual API call
    return [];
  }

  async _downloadSettings() {
    // TODO: Implement actual API call
    return {};
  }

  async _uploadTransaction(transaction) {
    // TODO: Implement actual API call
    console.log('[OfflineSync] Uploading transaction:', transaction.id);
  }

  async _uploadConversation(conversation) {
    // TODO: Implement actual API call
    console.log('[OfflineSync] Uploading conversation:', conversation.id);
  }

  async _uploadPattern(pattern) {
    // TODO: Implement actual API call
    console.log('[OfflineSync] Uploading pattern:', pattern.id);
  }

  async _uploadGuardianMessage(message) {
    // TODO: Implement actual API call
    console.log('[OfflineSync] Uploading guardian message:', message.id);
  }

  async _uploadSetting(key, value) {
    // TODO: Implement actual API call
    console.log('[OfflineSync] Uploading setting:', key);
  }

  // ==================== STATUS & EVENTS ====================

  /**
   * Update sync status
   */
  _updateStatus(status) {
    this.syncStatus = status;

    this._notifyListeners({
      type: 'status_change',
      status
    });
  }

  /**
   * Get sync status
   */
  getStatus() {
    return {
      isOnline: this.isOnline,
      syncStatus: this.syncStatus,
      lastSyncTime: this.lastSyncTime,
      lastSyncAgo: this.lastSyncTime
        ? Date.now() - this.lastSyncTime
        : null
    };
  }

  /**
   * Subscribe to sync events
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
        console.error('[OfflineSync] Listener error:', error);
      }
    }
  }

  /**
   * Shutdown offline sync
   */
  async shutdown() {
    this._stopSyncIntervals();

    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
    }

    await queueManager.shutdown();
    await cacheManager.shutdown();
    await localDatabase.close();

    console.log('[OfflineSync] Shutdown complete');
  }
}

// Export singleton instance
const offlineSync = new OfflineSync();
export default offlineSync;

// Export class and constants for testing
export { OfflineSync, SYNC_CONFIG, SYNC_STATUS };
