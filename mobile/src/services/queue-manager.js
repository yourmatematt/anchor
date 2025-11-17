/**
 * Queue Manager Service
 *
 * Manages action queue for offline operations
 * Processes queued actions when back online with retry logic
 *
 * Queued Actions:
 * - Payment requests
 * - AI conversations
 * - Guardian messages
 * - Pattern updates
 * - Settings changes
 */

import localDatabase from './local-database';
import NetInfo from '@react-native-community/netinfo';
import { v4 as uuidv4 } from 'uuid';

// Action priorities
const PRIORITY = {
  CRITICAL: 10, // Emergency guardian alerts, crisis messages
  HIGH: 7,      // Payment requests, AI conversations
  MEDIUM: 5,    // Pattern updates, normal guardian messages
  LOW: 3,       // Settings changes, preferences
  BACKGROUND: 1 // Analytics, non-essential data
};

// Action types
const ACTION_TYPE = {
  PAYMENT_REQUEST: 'payment_request',
  AI_CONVERSATION: 'ai_conversation',
  GUARDIAN_MESSAGE: 'guardian_message',
  PATTERN_UPDATE: 'pattern_update',
  SETTING_UPDATE: 'setting_update',
  TRANSACTION_FLAG: 'transaction_flag',
  EMERGENCY_ALERT: 'emergency_alert'
};

// Retry configuration
const RETRY_CONFIG = {
  MAX_RETRIES: 5,
  BASE_DELAY: 2000,      // 2 seconds
  MAX_DELAY: 300000,     // 5 minutes
  BACKOFF_FACTOR: 2
};

class QueueManager {
  constructor() {
    this.isProcessing = false;
    this.isOnline = true;
    this.processingInterval = null;
    this.listeners = [];
    this.stats = {
      processed: 0,
      failed: 0,
      retried: 0
    };
  }

  /**
   * Initialize queue manager
   */
  async initialize() {
    await localDatabase.initialize();

    // Monitor network state
    this.unsubscribeNetInfo = NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected && state.isInternetReachable;

      console.log('[QueueManager] Network state:', {
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        isOnline: this.isOnline
      });

      // Start processing when coming online
      if (!wasOnline && this.isOnline) {
        console.log('[QueueManager] Back online - starting queue processing');
        this.startProcessing();
      }

      // Notify listeners of network change
      this._notifyListeners({ type: 'network', isOnline: this.isOnline });
    });

    // Start processing if online
    if (this.isOnline) {
      this.startProcessing();
    }

    console.log('[QueueManager] Initialized successfully');
  }

  /**
   * Add action to queue
   */
  async enqueue(actionType, data, options = {}) {
    const priority = options.priority || this._getDefaultPriority(actionType);
    const recordId = options.recordId || uuidv4();

    // Determine table name from action type
    const tableName = this._getTableName(actionType);

    await localDatabase.addToSyncQueue(
      actionType,
      tableName,
      recordId,
      data,
      priority
    );

    console.log('[QueueManager] Enqueued:', {
      actionType,
      recordId,
      priority
    });

    // Notify listeners
    this._notifyListeners({
      type: 'enqueued',
      actionType,
      recordId,
      priority
    });

    // Try to process immediately if online
    if (this.isOnline && !this.isProcessing) {
      this.processQueue();
    }

    return recordId;
  }

  /**
   * Get default priority for action type
   */
  _getDefaultPriority(actionType) {
    switch (actionType) {
      case ACTION_TYPE.EMERGENCY_ALERT:
        return PRIORITY.CRITICAL;

      case ACTION_TYPE.PAYMENT_REQUEST:
      case ACTION_TYPE.AI_CONVERSATION:
        return PRIORITY.HIGH;

      case ACTION_TYPE.GUARDIAN_MESSAGE:
      case ACTION_TYPE.PATTERN_UPDATE:
      case ACTION_TYPE.TRANSACTION_FLAG:
        return PRIORITY.MEDIUM;

      case ACTION_TYPE.SETTING_UPDATE:
        return PRIORITY.LOW;

      default:
        return PRIORITY.BACKGROUND;
    }
  }

  /**
   * Get table name from action type
   */
  _getTableName(actionType) {
    switch (actionType) {
      case ACTION_TYPE.PAYMENT_REQUEST:
      case ACTION_TYPE.TRANSACTION_FLAG:
        return 'transactions';

      case ACTION_TYPE.AI_CONVERSATION:
        return 'conversations';

      case ACTION_TYPE.GUARDIAN_MESSAGE:
      case ACTION_TYPE.EMERGENCY_ALERT:
        return 'guardian_messages';

      case ACTION_TYPE.PATTERN_UPDATE:
        return 'patterns';

      case ACTION_TYPE.SETTING_UPDATE:
        return 'settings';

      default:
        return 'sync_queue';
    }
  }

  /**
   * Start processing queue
   */
  startProcessing() {
    if (this.processingInterval) {
      return; // Already processing
    }

    console.log('[QueueManager] Starting queue processing');

    // Process immediately
    this.processQueue();

    // Then process every 30 seconds
    this.processingInterval = setInterval(() => {
      if (this.isOnline) {
        this.processQueue();
      }
    }, 30000);
  }

  /**
   * Stop processing queue
   */
  stopProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log('[QueueManager] Stopped queue processing');
    }
  }

  /**
   * Process queue
   */
  async processQueue() {
    if (!this.isOnline || this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      const items = await localDatabase.getNextSyncItems(10);

      if (items.length === 0) {
        this.isProcessing = false;
        return;
      }

      console.log(`[QueueManager] Processing ${items.length} items`);

      for (const item of items) {
        await this._processItem(item);
      }

      // Continue processing if there are more items
      const remainingSize = await localDatabase.getSyncQueueSize();
      if (remainingSize > 0) {
        // Process next batch after a short delay
        setTimeout(() => this.processQueue(), 1000);
      }
    } catch (error) {
      console.error('[QueueManager] Queue processing error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process individual queue item
   */
  async _processItem(item) {
    console.log('[QueueManager] Processing item:', {
      id: item.id,
      action: item.action,
      retryCount: item.retryCount
    });

    try {
      // Check if should retry
      if (item.retryCount >= item.maxRetries) {
        console.warn('[QueueManager] Item exceeded max retries:', item.id);
        await this._handleFailedItem(item);
        return;
      }

      // Process based on action type
      let success = false;

      switch (item.action) {
        case ACTION_TYPE.PAYMENT_REQUEST:
          success = await this._processPaymentRequest(item);
          break;

        case ACTION_TYPE.AI_CONVERSATION:
          success = await this._processAIConversation(item);
          break;

        case ACTION_TYPE.GUARDIAN_MESSAGE:
        case ACTION_TYPE.EMERGENCY_ALERT:
          success = await this._processGuardianMessage(item);
          break;

        case ACTION_TYPE.PATTERN_UPDATE:
          success = await this._processPatternUpdate(item);
          break;

        case ACTION_TYPE.SETTING_UPDATE:
          success = await this._processSettingUpdate(item);
          break;

        case ACTION_TYPE.TRANSACTION_FLAG:
          success = await this._processTransactionFlag(item);
          break;

        default:
          console.warn('[QueueManager] Unknown action type:', item.action);
          success = false;
      }

      if (success) {
        await this._handleSuccessfulItem(item);
      } else {
        await this._handleRetry(item);
      }
    } catch (error) {
      console.error('[QueueManager] Item processing error:', error);
      await this._handleRetry(item);
    }
  }

  /**
   * Process payment request
   */
  async _processPaymentRequest(item) {
    try {
      // Call API to process payment request
      const response = await fetch(`${process.env.API_URL}/api/payments/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add auth headers
        },
        body: JSON.stringify(item.data)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('[QueueManager] Payment request processed:', result);
        return true;
      } else {
        const error = await response.text();
        console.error('[QueueManager] Payment request failed:', error);
        return false;
      }
    } catch (error) {
      console.error('[QueueManager] Payment request error:', error);
      return false;
    }
  }

  /**
   * Process AI conversation
   */
  async _processAIConversation(item) {
    try {
      // Call API to sync conversation
      const response = await fetch(`${process.env.API_URL}/api/ai/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add auth headers
        },
        body: JSON.stringify(item.data)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('[QueueManager] AI conversation synced:', result);

        // Mark local conversation as synced
        await localDatabase.markConversationSynced(item.recordId);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('[QueueManager] AI conversation sync error:', error);
      return false;
    }
  }

  /**
   * Process guardian message
   */
  async _processGuardianMessage(item) {
    try {
      // Call API to send guardian message
      const response = await fetch(`${process.env.API_URL}/api/guardian/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add auth headers
        },
        body: JSON.stringify(item.data)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('[QueueManager] Guardian message sent:', result);

        // Mark local message as synced
        await localDatabase.markGuardianMessageSynced(item.recordId);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('[QueueManager] Guardian message error:', error);
      return false;
    }
  }

  /**
   * Process pattern update
   */
  async _processPatternUpdate(item) {
    try {
      // Call API to sync pattern
      const response = await fetch(`${process.env.API_URL}/api/patterns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add auth headers
        },
        body: JSON.stringify(item.data)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('[QueueManager] Pattern synced:', result);

        // Mark local pattern as synced
        await localDatabase.markPatternSynced(item.recordId);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('[QueueManager] Pattern sync error:', error);
      return false;
    }
  }

  /**
   * Process setting update
   */
  async _processSettingUpdate(item) {
    try {
      // Call API to sync setting
      const response = await fetch(`${process.env.API_URL}/api/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          // Add auth headers
        },
        body: JSON.stringify(item.data)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('[QueueManager] Setting synced:', result);

        // Mark local setting as synced
        await localDatabase.markSettingSynced(item.data.key);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('[QueueManager] Setting sync error:', error);
      return false;
    }
  }

  /**
   * Process transaction flag
   */
  async _processTransactionFlag(item) {
    try {
      // Call API to flag transaction
      const response = await fetch(
        `${process.env.API_URL}/api/transactions/${item.recordId}/flag`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Add auth headers
          },
          body: JSON.stringify(item.data)
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log('[QueueManager] Transaction flagged:', result);

        // Mark local transaction as synced
        await localDatabase.markTransactionSynced(item.recordId);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('[QueueManager] Transaction flag error:', error);
      return false;
    }
  }

  /**
   * Handle successful item
   */
  async _handleSuccessfulItem(item) {
    await localDatabase.removeFromSyncQueue(item.id);
    this.stats.processed++;

    console.log('[QueueManager] Item processed successfully:', item.id);

    this._notifyListeners({
      type: 'processed',
      item,
      success: true
    });
  }

  /**
   * Handle retry
   */
  async _handleRetry(item) {
    const nextRetry = item.retryCount + 1;

    if (nextRetry >= item.maxRetries) {
      await this._handleFailedItem(item);
      return;
    }

    // Calculate exponential backoff delay
    const delay = Math.min(
      RETRY_CONFIG.BASE_DELAY * Math.pow(RETRY_CONFIG.BACKOFF_FACTOR, item.retryCount),
      RETRY_CONFIG.MAX_DELAY
    );

    console.log('[QueueManager] Scheduling retry:', {
      id: item.id,
      retryCount: nextRetry,
      delay: `${delay}ms`
    });

    // Update retry count
    await localDatabase.updateSyncQueueRetry(item.id);
    this.stats.retried++;

    this._notifyListeners({
      type: 'retrying',
      item,
      retryCount: nextRetry,
      delay
    });
  }

  /**
   * Handle failed item
   */
  async _handleFailedItem(item) {
    console.error('[QueueManager] Item failed after max retries:', item.id);

    // Store failed items for manual review
    await localDatabase.setSetting(
      `failed_sync_${item.id}`,
      {
        item,
        failedAt: Date.now(),
        reason: 'Max retries exceeded'
      }
    );

    // Remove from queue
    await localDatabase.removeFromSyncQueue(item.id);
    this.stats.failed++;

    this._notifyListeners({
      type: 'failed',
      item,
      reason: 'Max retries exceeded'
    });
  }

  /**
   * Get queue status
   */
  async getStatus() {
    const queueSize = await localDatabase.getSyncQueueSize();
    const items = await localDatabase.getNextSyncItems(5);

    return {
      isOnline: this.isOnline,
      isProcessing: this.isProcessing,
      queueSize,
      nextItems: items,
      stats: { ...this.stats }
    };
  }

  /**
   * Get queue size
   */
  async getQueueSize() {
    return await localDatabase.getSyncQueueSize();
  }

  /**
   * Clear queue (for testing/emergency)
   */
  async clearQueue() {
    const items = await localDatabase.getNextSyncItems(1000);

    for (const item of items) {
      await localDatabase.removeFromSyncQueue(item.id);
    }

    console.log('[QueueManager] Queue cleared');
    this._notifyListeners({ type: 'cleared' });
  }

  /**
   * Subscribe to queue events
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
        console.error('[QueueManager] Listener error:', error);
      }
    }
  }

  /**
   * Shutdown queue manager
   */
  async shutdown() {
    this.stopProcessing();

    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
    }

    console.log('[QueueManager] Shutdown complete');
  }
}

// Export singleton instance
const queueManager = new QueueManager();
export default queueManager;

// Export class and constants for testing
export { QueueManager, PRIORITY, ACTION_TYPE, RETRY_CONFIG };
